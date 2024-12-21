import logging
from flask import Blueprint, jsonify, request
from kubernetes_client import get_core_v1_api

# Set up logging
logger = logging.getLogger(__name__)

pods_bp = Blueprint('pods', __name__)

@pods_bp.route('/pods/<namespace>')
def get_pods(namespace):
    logger.info(f'Fetching pods for namespace: {namespace}')
    try:
        page = int(request.args.get('page', 1))
        page_size = 10
        v1 = get_core_v1_api()
        pods = v1.list_namespaced_pod(namespace).items
        total_pods = len(pods)
        total_pages = (total_pods + page_size - 1) // page_size
        start = (page - 1) * page_size
        end = start + page_size
        pod_list = [{'name': pod.metadata.name, 'state': pod.status.phase, 'start_time': pod.status.start_time} for pod in pods[start:end]]
        logger.info(f'Successfully fetched {len(pod_list)} pods for namespace: {namespace}')
        return jsonify({'pods': pod_list, 'totalPages': total_pages})
    except Exception as e:
        logger.error(f'Error fetching pods for namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500

@pods_bp.route('/statefulset-pods/<namespace>/<statefulset_name>')
def get_statefulset_pods(namespace, statefulset_name):
    logger.info(f'Fetching statefulset pods for statefulset: {statefulset_name} in namespace: {namespace}')
    try:
        v1 = get_core_v1_api()
        label_selector = f"app={statefulset_name}"
        pods = v1.list_namespaced_pod(namespace, label_selector=label_selector).items
        if len(pods) == 0:
            label_selector = f"app.kubernetes.io/name={statefulset_name}"
            pods = v1.list_namespaced_pod(namespace, label_selector=label_selector).items
        pod_list = [{'name': pod.metadata.name, 'state': pod.status.phase, 'start_time': pod.status.start_time} for pod in pods]
        logger.info(f'Successfully fetched {len(pod_list)} statefulset pods for statefulset: {statefulset_name} in namespace: {namespace}')
        return jsonify({'pods': pod_list})
    except Exception as e:
        logger.error(f'Error fetching statefulset pods for statefulset {statefulset_name} in namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500

@pods_bp.route('/deployment-pods/<namespace>/<deployment_name>')
def get_deployment_pods(namespace, deployment_name):
    logger.info(f'Fetching deployment pods for deployment: {deployment_name} in namespace: {namespace}')
    try:
        v1 = get_core_v1_api()
        label_selector = f"app={deployment_name}"
        pods = v1.list_namespaced_pod(namespace, label_selector=label_selector).items
        if len(pods) == 0:
            label_selector = f"app.kubernetes.io/name={deployment_name}"
            pods = v1.list_namespaced_pod(namespace, label_selector=label_selector).items
        pod_list = [{'name': pod.metadata.name, 'state': pod.status.phase, 'start_time': pod.status.start_time} for pod in pods]
        logger.info(f'Successfully fetched {len(pod_list)} deployment pods for deployment: {deployment_name} in namespace: {namespace}')
        return jsonify({'pods': pod_list})
    except Exception as e:
        logger.error(f'Error fetching deployment pods for deployment {deployment_name} in namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500

@pods_bp.route('/pod-logs/<namespace>/<pod_name>')
def get_pod_logs(namespace, pod_name):
    logger.info(f'Fetching logs for pod: {pod_name} in namespace: {namespace}')
    try:
        v1 = get_core_v1_api()
        logs = v1.read_namespaced_pod_log(name=pod_name, namespace=namespace)
        logger.info(f'Successfully fetched logs for pod: {pod_name} in namespace: {namespace}')
        return jsonify({'logs': logs})
    except client.exceptions.ApiException as e:
        logger.error(f'Error fetching logs for pod {pod_name} in namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500

@pods_bp.route('/delete-pod/<namespace>/<pod_name>', methods=['DELETE'])
def delete_pod(namespace, pod_name):
    logger.info(f'Deleting pod: {pod_name} in namespace: {namespace}')
    try:
        v1 = get_core_v1_api()
        response = v1.delete_namespaced_pod(name=pod_name, namespace=namespace)
        logger.info(f'Successfully deleted pod: {pod_name} in namespace: {namespace}')
        return jsonify({'message': 'Pod deleted successfully', 'response': response.to_dict()})
    except client.exceptions.ApiException as e:
        logger.error(f'Error deleting pod {pod_name} in namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500
