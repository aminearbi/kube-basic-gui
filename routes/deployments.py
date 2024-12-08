from flask import Blueprint, jsonify, request
from kubernetes_client import get_apps_v1_api

deployments_bp = Blueprint('deployments', __name__)

@deployments_bp.route('/deployments/<namespace>')
def get_deployments(namespace):
    apps_v1 = get_apps_v1_api()
    deployments = apps_v1.list_namespaced_deployment(namespace).items
    deployment_list = [{'name': dp.metadata.name, 'replicas': dp.spec.replicas} for dp in deployments]
    return jsonify({'deployments': deployment_list})

@deployments_bp.route('/scale-deployment/<namespace>/<deployment_name>', methods=['POST'])
def scale_deployment(namespace, deployment_name):
    replicas = request.json.get('replicas')
    apps_v1 = get_apps_v1_api()
    body = {'spec': {'replicas': replicas}}
    apps_v1.patch_namespaced_deployment_scale(name=deployment_name, namespace=namespace, body=body)
    return jsonify({'message': 'Deployment scaled successfully'})
