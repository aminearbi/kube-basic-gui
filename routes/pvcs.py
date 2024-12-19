from flask import Blueprint, jsonify
from kubernetes_client import get_core_v1_api

pvcs_bp = Blueprint('pvcs', __name__)

@pvcs_bp.route('/pvcs/<namespace>')
def get_pvcs(namespace):
    v1 = get_core_v1_api()
    pvcs = v1.list_namespaced_persistent_volume_claim(namespace).items
    pvc_list = [{'name': pvc.metadata.name,'access_modes':pvc.spec.access_modes, 'storage_class': pvc.spec.storage_class_name,
                 'capacity': pvc.status.capacity["storage"], 'status': pvc.status.phase} for pvc in pvcs]
    return jsonify({'pvcs': pvc_list})
