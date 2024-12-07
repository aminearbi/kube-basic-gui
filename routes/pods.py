from flask import Blueprint, jsonify
from kubernetes_client import get_core_v1_api

pods_bp = Blueprint('pods', __name__)

@pods_bp.route('/pods/<namespace>')
def get_pods(namespace):
    v1 = get_core_v1_api()
    pods = v1.list_namespaced_pod(namespace).items
    pod_list = [{'name': pod.metadata.name, 'start_time': pod.status.start_time} for pod in pods]
    return jsonify({'pods': pod_list})

@pods_bp.route('/statefulset-pods/<namespace>/<statefulset_name>')
def get_statefulset_pods(namespace, statefulset_name):
    v1 = get_core_v1_api()
    label_selector = f"app={statefulset_name}"
    pods = v1.list_namespaced_pod(namespace, label_selector=label_selector).items
    pod_list = [{'name': pod.metadata.name, 'start_time': pod.status.start_time} for pod in pods]
    return jsonify({'pods': pod_list})

@pods_bp.route('/deployment-pods/<namespace>/<deployment_name>')
def get_deployment_pods(namespace, deployment_name):
    v1 = get_core_v1_api()
    label_selector = f"app={deployment_name}"
    pods = v1.list_namespaced_pod(namespace, label_selector=label_selector).items
    pod_list = [{'name': pod.metadata.name, 'start_time': pod.status.start_time} for pod in pods]
    return jsonify({'pods': pod_list})

@pods_bp.route('/pod-logs/<namespace>/<pod_name>')
def get_pod_logs(namespace, pod_name):
    v1 = get_core_v1_api()
    try:
        logs = v1.read_namespaced_pod_log(name=pod_name, namespace=namespace)
        return jsonify({'logs': logs})
    except client.exceptions.ApiException as e:
        return jsonify({'error': str(e)}), 500

@pods_bp.route('/delete-pod/<namespace>/<pod_name>', methods=['DELETE'])
def delete_pod(namespace, pod_name):
    v1 = get_core_v1_api()
    v1.delete_namespaced_pod(name=pod_name, namespace=namespace)
    return jsonify({'message': 'Pod deleted successfully'})
