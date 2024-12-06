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
    batch_v1 = client.BatchV1Api()

    deployments = apps_v1.list_namespaced_deployment(namespace).items
    statefulsets = apps_v1.list_namespaced_stateful_set(namespace).items
    services = v1.list_namespaced_service(namespace).items
    pvcs = v1.list_namespaced_persistent_volume_claim(namespace).items
    cronjobs = batch_v1.list_namespaced_cron_job(namespace).items

    resources = {
        "deployments": [{"name": d.metadata.name, "replicas": d.status.replicas, "readyReplicas": d.status.ready_replicas} for d in deployments],
        "statefulsets": [{"name": s.metadata.name, "replicas": s.status.replicas, "readyReplicas": s.status.ready_replicas} for s in statefulsets],
        "services": [{"name": svc.metadata.name, "type": svc.spec.type, "clusterIP": svc.spec.cluster_ip, "ports": [{"port": p.port, "protocol": p.protocol} for p in svc.spec.ports]} for svc in services],
        "pvcs": [{"name": pvc.metadata.name} for pvc in pvcs],
        "cronjobs": [{"name": cj.metadata.name, "schedule": cj.spec.schedule} for cj in cronjobs]
    }

    return jsonify(resources)

@app.route('/jobs/<namespace>/<cronjob_name>', methods=['GET'])
def get_jobs(namespace, cronjob_name):
    batch_v1 = client.BatchV1Api()
    jobs = batch_v1.list_namespaced_job(namespace).items
    related_jobs = [job for job in jobs if job.metadata.owner_references and job.metadata.owner_references[0].name == cronjob_name]

    job_list = []
    for job in related_jobs:
        creation_time = job.metadata.creation_timestamp
        age = datetime.now(timezone.utc) - creation_time
        job_list.append({
            "name": job.metadata.name,
            "status": job.status.conditions[0].type if job.status.conditions else "Unknown",
            "age": str(age).split('.')[0]  # Format age as "days, hours:minutes:seconds"
        })
    return jsonify(job_list)

@app.route('/terminate-job', methods=['POST'])
def terminate_job():
    data = request.json
    namespace = data['namespace']
    job_name = data['jobName']

    batch_v1 = client.BatchV1Api()
    core_v1 = client.CoreV1Api()

    # Delete the job
    batch_v1.delete_namespaced_job(name=job_name, namespace=namespace, body=client.V1DeleteOptions())

    # Delete the pods created by the job
    pods = core_v1.list_namespaced_pod(namespace, label_selector=f"job-name={job_name}").items
    for pod in pods:
        core_v1.delete_namespaced_pod(name=pod.metadata.name, namespace=namespace, body=client.V1DeleteOptions())

    return jsonify({'message': 'Job and its pods terminated successfully'}), 200

@app.route('/update-cronjob', methods=['POST'])
def update_cronjob():
    data = request.json
    namespace = data['namespace']
    cronjob_name = data['cronJobName']
    new_schedule = data['newSchedule']

    batch_v1 = client.BatchV1Api()
    cronjob = batch_v1.read_namespaced_cron_job(name=cronjob_name, namespace=namespace)
    cronjob.spec.schedule = new_schedule

    batch_v1.patch_namespaced_cron_job(name=cronjob_name, namespace=namespace, body=cronjob)
    return jsonify({'message': 'CronJob updated successfully'}), 200


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
