import logging
from flask import Blueprint, jsonify
from kubernetes_client import get_core_v1_api
from kubernetes import client, config
from kubernetes.stream import stream
import os
import base64

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

@pvcs_bp.route('/pvcs/<namespace>/<pvc_name>/content', methods=['GET'])
def get_pvc_content(namespace, pvc_name):
    logger.info(f'Fetching content for PVC: {pvc_name} in namespace: {namespace}')
    try:
        v1 = get_core_v1_api()
        pvc = v1.read_namespaced_persistent_volume_claim(name=pvc_name, namespace=namespace)
        pvc_content = {
            'name': pvc.metadata.name,
            'namespace': pvc.metadata.namespace,
            'access_modes': pvc.spec.access_modes,
            'storage_class': pvc.spec.storage_class_name,
            'capacity': pvc.status.capacity["storage"],
            'status': pvc.status.phase,
            'volume_name': pvc.spec.volume_name
        }
        logger.info(f'Successfully fetched content for PVC: {pvc_name} in namespace: {namespace}')
        return jsonify({'pvc_content': pvc_content})
    except Exception as e:
        logger.error(f'Error fetching content for PVC {pvc_name} in namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500

@pvcs_bp.route('/pvcs/<namespace>/<pvc_name>/files', methods=['GET'])
def get_pvc_files(namespace, pvc_name):
    logger.info(f'Fetching files for PVC: {pvc_name} in namespace: {namespace}')
    pod_name = f"pvc-reader-{pvc_name}"
    try:
        v1 = get_core_v1_api()
        
        # Check if the pod already exists
        try:
            pod_status = v1.read_namespaced_pod_status(name=pod_name, namespace=namespace)
            if pod_status.status.phase != "Running":
                raise Exception("Pod is not running")
        except client.exceptions.ApiException as e:
            if e.status != 404:
                raise e
            # Pod does not exist, create it
            pod_manifest = {
                "apiVersion": "v1",
                "kind": "Pod",
                "metadata": {
                    "name": pod_name,
                    "namespace": namespace
                },
                "spec": {
                    "containers": [{
                        "name": "pvc-reader",
                        "image": "busybox",
                        "command": ["sh", "-c", "while true; do sleep 3600; done"],
                        "volumeMounts": [{
                            "mountPath": "/mnt/pvc",
                            "name": "pvc-volume"
                        }]
                    }],
                    "volumes": [{
                        "name": "pvc-volume",
                        "persistentVolumeClaim": {
                            "claimName": pvc_name
                        }
                    }],
                    "restartPolicy": "Never"
                }
            }
            v1.create_namespaced_pod(namespace=namespace, body=pod_manifest)
            logger.info(f'Pod created to read PVC: {pvc_name} in namespace: {namespace}')

            # Wait for the pod to be running
            while True:
                pod_status = v1.read_namespaced_pod_status(name=pod_name, namespace=namespace)
                if pod_status.status.phase == "Running":
                    break

        # Execute a command in the pod to list the files
        exec_command = ['ls', '-l', '/mnt/pvc']
        resp = stream(v1.connect_get_namespaced_pod_exec, pod_name, namespace, command=exec_command, stderr=True, stdin=False, stdout=True, tty=False)
        logger.info(f'Files in PVC: {pvc_name} in namespace: {namespace}: {resp}')

        return jsonify({'files': resp.split('\n')})
    except Exception as e:
        logger.error(f'Error fetching files for PVC {pvc_name} in namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500

@pvcs_bp.route('/pvcs/<namespace>/<pvc_name>/delete-pod', methods=['DELETE'])
def delete_pvc_reader_pod(namespace, pvc_name):
    logger.info(f'Deleting pod for PVC: {pvc_name} in namespace: {namespace}')
    pod_name = f"pvc-reader-{pvc_name}"
    try:
        v1 = get_core_v1_api()
        v1.delete_namespaced_pod(name=pod_name, namespace=namespace)
        logger.info(f'Pod deleted for PVC: {pvc_name} in namespace: {namespace}')
        return jsonify({'message': f'Pod {pod_name} deleted successfully'}), 200
    except Exception as e:
        logger.error(f'Error deleting pod for PVC {pvc_name} in namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500