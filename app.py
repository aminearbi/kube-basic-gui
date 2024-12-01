from flask import Flask, jsonify, request, send_from_directory
from kubernetes import client, config
from datetime import datetime, timezone
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
    v1 = client.CoreV1Api()
    apps_v1 = client.AppsV1Api()

    deployments = apps_v1.list_namespaced_deployment(namespace).items
    statefulsets = apps_v1.list_namespaced_stateful_set(namespace).items
    services = v1.list_namespaced_service(namespace).items
    pvcs = v1.list_namespaced_persistent_volume_claim(namespace).items

    resources = {
        "deployments": [{"name": d.metadata.name, "replicas": d.status.replicas, "readyReplicas": d.status.ready_replicas} for d in deployments],
        "statefulsets": [{"name": s.metadata.name, "replicas": s.status.replicas, "readyReplicas": s.status.ready_replicas} for s in statefulsets],
        "services": [{"name": svc.metadata.name} for svc in services],
        "pvcs": [{"name": pvc.metadata.name} for pvc in pvcs]
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

@app.route('/pods/<namespace>/<resource_type>/<resource_name>', methods=['GET'])
def get_pods(namespace, resource_type, resource_name):
    v1 = client.CoreV1Api()
    label_selector = f"app={resource_name}"
    pods = v1.list_namespaced_pod(namespace, label_selector=label_selector).items
    pod_list = []
    for pod in pods:
        creation_time = pod.metadata.creation_timestamp
        age = datetime.now(timezone.utc) - creation_time
        pod_list.append({
            "name": pod.metadata.name,
            "status": pod.status.phase,
            "age": str(age).split('.')[0]  # Format age as "days, hours:minutes:seconds"
        })
    return jsonify(pod_list)

@app.route('/logs/<namespace>/<pod_name>', methods=['GET'])
def get_pod_logs(namespace, pod_name):
    v1 = client.CoreV1Api()
    try:
        logs = v1.read_namespaced_pod_log(name=pod_name, namespace=namespace)
        last_20_lines = '\n'.join(logs.splitlines()[-20:])
        return jsonify({"logs": last_20_lines})
    except client.exceptions.ApiException as e:
        return jsonify({"error": str(e)}), 500






if __name__ == '__main__':
    app.run(port=8080, debug=True)
