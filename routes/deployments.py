import logging
from flask import Blueprint, jsonify, request
from kubernetes_client import get_apps_v1_api

# Set up logging
logger = logging.getLogger(__name__)

deployments_bp = Blueprint('deployments', __name__)

@deployments_bp.route('/deployments/<namespace>')
def get_deployments(namespace):
    logger.info(f'Getting deployments in namespace {namespace}')
    try:
        apps_v1 = get_apps_v1_api()
        deployments = apps_v1.list_namespaced_deployment(namespace).items
        logger.debug(f'Found {len(deployments)} deployments in namespace {namespace}')
        deployment_list = [{'name': dp.metadata.name, 'replicas': dp.spec.replicas} for dp in deployments]
        logger.debug(f'Deployments: {deployment_list}')
        return jsonify({'deployments': deployment_list})
    except client.rest.ApiException as e:
        logger.error(f'Error getting deployments: {e}')
        return jsonify({'error': 'Error getting deployments'}), 500

@deployments_bp.route('/scale-deployment/<namespace>/<deployment_name>', methods=['POST'])
def scale_deployment(namespace, deployment_name):
    replicas = request.json.get('replicas')
    logger.info(f'Scaling deployment {deployment_name} in namespace {namespace} to {replicas} replicas')
    try:
        apps_v1 = get_apps_v1_api()
        body = {'spec': {'replicas': replicas}}
        response = apps_v1.patch_namespaced_deployment_scale(name=deployment_name, namespace=namespace, body=body)
        logger.info(f'Deployment {deployment_name} scaled to {replicas} replicas')
        return jsonify({'message': 'Deployment scaled successfully', 'response': response.to_dict()})
    except client.rest.ApiException as e:
        logger.error(f'Error scaling deployment: {e}')
        return jsonify({'error': 'Error scaling deployment'}), 500