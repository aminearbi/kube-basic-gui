import logging
from flask import Blueprint, jsonify, request
from kubernetes_client import get_apps_v1_api

# Set up logging
logger = logging.getLogger(__name__)

statefulsets_bp = Blueprint('statefulsets', __name__)

@statefulsets_bp.route('/statefulsets/<namespace>')
def get_statefulsets(namespace):
    logger.info(f'Fetching statefulsets for namespace: {namespace}')
    try:
        apps_v1 = get_apps_v1_api()
        statefulsets = apps_v1.list_namespaced_stateful_set(namespace).items
        statefulset_list = [{'name': ss.metadata.name, 'replicas': ss.spec.replicas} for ss in statefulsets]
        logger.info(f'Successfully fetched {len(statefulset_list)} statefulsets for namespace: {namespace}')
        return jsonify({'statefulsets': statefulset_list})
    except Exception as e:
        logger.error(f'Error fetching statefulsets for namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500

@statefulsets_bp.route('/scale-statefulset/<namespace>/<statefulset_name>', methods=['POST'])
def scale_statefulset(namespace, statefulset_name):
    logger.info(f'Scaling statefulset: {statefulset_name} in namespace: {namespace}')
    try:
        replicas = request.json.get('replicas')
        apps_v1 = get_apps_v1_api()
        body = {'spec': {'replicas': replicas}}
        response = apps_v1.patch_namespaced_stateful_set_scale(name=statefulset_name, namespace=namespace, body=body)
        logger.info(f'Successfully scaled statefulset: {statefulset_name} to {replicas} replicas in namespace: {namespace}')
        return jsonify({'message': 'StatefulSet scaled successfully', 'response': response.to_dict()})
    except Exception as e:
        logger.error(f'Error scaling statefulset {statefulset_name} in namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500
