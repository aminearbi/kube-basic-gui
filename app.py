from flask import Flask, jsonify, request, send_from_directory
from kubernetes import client, config
import yaml
import os

app = Flask(__name__, static_folder='frontend', static_url_path='')

# Load Kubernetes config
config.load_kube_config()

# Load namespaces from config file
config_file_path = 'config.yaml'
with open(config_file_path, 'r') as file:
    config_data = yaml.safe_load(file)
    namespaces = config_data['namespaces']

@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/namespaces', methods=['GET'])
def get_namespaces():
    return jsonify(namespaces)

@app.route('/resources/<namespace>', methods=['GET'])
def get_resources(namespace):
    v1 = client.AppsV1Api()
    statefulsets = v1.list_namespaced_stateful_set(namespace=namespace)
    deployments = v1.list_namespaced_deployment(namespace=namespace)
    resources = {
        'statefulsets': [{'name': ss.metadata.name, 'replicas': ss.status.replicas, 'readyReplicas': ss.status.ready_replicas} for ss in statefulsets.items],
        'deployments': [{'name': dp.metadata.name, 'replicas': dp.status.replicas, 'readyReplicas': dp.status.ready_replicas} for dp in deployments.items]
    }
    return jsonify(resources)

@app.route('/scale', methods=['POST'])
def scale_resource():
    data = request.json
    namespace = data['namespace']
    resource_type = data['resource_type']
    name = data['name']
    replicas = int(data['replicas'])
    if replicas < 0 or replicas > 10:
        return jsonify({'message': 'Replicas value must be between 0 and 10'}), 400
    print(f"Scaling {resource_type} {name} in {namespace} to {replicas} replicas")

    v1 = client.AppsV1Api()
    if resource_type == 'statefulset':
        body = {'spec': {'replicas': replicas}}
        v1.patch_namespaced_stateful_set_scale(name, namespace, body)
    elif resource_type == 'deployment':
        body = {'spec': {'replicas': replicas}}
        v1.patch_namespaced_deployment_scale(name, namespace, body)

    return jsonify({'message': 'Scaled successfully'}), 200

@app.route('/log', methods=['POST'])
def log_message():
    data = request.json
    log = data['log']
    print(f"Log from frontend: {log}")
    return jsonify({'message': 'Log received'}), 200

if __name__ == '__main__':
    app.run(port=8080, debug=True)
