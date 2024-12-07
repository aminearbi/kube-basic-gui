from flask import Blueprint, jsonify
from kubernetes_client import get_core_v1_api

pvcs_bp = Blueprint('pvcs', __name__)

@pvcs_bp.route('/pvcs/<namespace>')
def get_pvcs(namespace):
    v1 = get_core_v1_api()
    pvcs = v1.list_namespaced_persistent_volume_claim(namespace).items
    pvc_list = [{'name': pvc.metadata.name} for pvc in pvcs]
    return jsonify({'pvcs': pvc_list})
