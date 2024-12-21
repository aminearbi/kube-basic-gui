import logging
from flask import Blueprint, jsonify
from kubernetes_client import get_core_v1_api

# Set up logging
logger = logging.getLogger(__name__)

pvcs_bp = Blueprint('pvcs', __name__)

@pvcs_bp.route('/pvcs/<namespace>')
def get_pvcs(namespace):
    logger.info(f'Fetching PVCs for namespace: {namespace}')
    try:
        v1 = get_core_v1_api()
        pvcs = v1.list_namespaced_persistent_volume_claim(namespace).items
        pvc_list = [{'name': pvc.metadata.name, 'access_modes': pvc.spec.access_modes, 'storage_class': pvc.spec.storage_class_name,
                     'capacity': pvc.status.capacity["storage"], 'status': pvc.status.phase} for pvc in pvcs]
        logger.info(f'Successfully fetched {len(pvc_list)} PVCs for namespace: {namespace}')
        return jsonify({'pvcs': pvc_list})
    except Exception as e:
        logger.error(f'Error fetching PVCs for namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500
