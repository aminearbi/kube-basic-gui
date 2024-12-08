from flask import Blueprint, jsonify, request
from kubernetes_client import get_apps_v1_api

statefulsets_bp = Blueprint('statefulsets', __name__)

@statefulsets_bp.route('/statefulsets/<namespace>')
def get_statefulsets(namespace):
    apps_v1 = get_apps_v1_api()
    statefulsets = apps_v1.list_namespaced_stateful_set(namespace).items
    statefulset_list = [{'name': ss.metadata.name, 'replicas': ss.spec.replicas} for ss in statefulsets]
    return jsonify({'statefulsets': statefulset_list})

@statefulsets_bp.route('/scale-statefulset/<namespace>/<statefulset_name>', methods=['POST'])
def scale_statefulset(namespace, statefulset_name):
    replicas = request.json.get('replicas')
    apps_v1 = get_apps_v1_api()
    body = {'spec': {'replicas': replicas}}
    apps_v1.patch_namespaced_stateful_set_scale(name=statefulset_name, namespace=namespace, body=body)
    return jsonify({'message': 'StatefulSet scaled successfully'})
