import logging
from flask import Blueprint, jsonify, request
from kubernetes import client
from kubernetes_client import get_batch_v1beta1_api, get_batch_v1_api, get_core_v1_api, is_valid_cron_expression

# Set up logging
logger = logging.getLogger(__name__)

cronjobs_bp = Blueprint('cronjobs', __name__)

@cronjobs_bp.route('/cronjobs/<namespace>')
def get_cronjobs(namespace):
    logger.info(f'Fetching cronjobs for namespace: {namespace}')
    try:
        batch_v1beta1 = get_batch_v1beta1_api()
        cronjobs = batch_v1beta1.list_namespaced_cron_job(namespace).items
        cronjob_list = [{'name': cj.metadata.name, 'schedule': cj.spec.schedule, 'suspend': cj.spec.suspend} for cj in cronjobs]
        logger.info(f'Successfully fetched {len(cronjob_list)} cronjobs for namespace: {namespace}')
        return jsonify({'cronjobs': cronjob_list})
    except Exception as e:
        logger.error(f'Error fetching cronjobs for namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500

@cronjobs_bp.route('/delete-cronjob/<namespace>/<cronjob_name>', methods=['DELETE'])
def delete_cronjob(namespace, cronjob_name):
    logger.info(f'Deleting cronjob: {cronjob_name} in namespace: {namespace}')
    try:
        batch_v1beta1 = get_batch_v1beta1_api()
        response = batch_v1beta1.delete_namespaced_cron_job(name=cronjob_name, namespace=namespace)
        logger.info(f'Successfully deleted cronjob: {cronjob_name} in namespace: {namespace}')
        return jsonify({'message': 'CronJob deleted successfully', 'response': response.to_dict()})
    except Exception as e:
        logger.error(f'Error deleting cronjob {cronjob_name} in namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500

@cronjobs_bp.route('/delete-job/<namespace>/<job_name>', methods=['DELETE'])
def delete_job(namespace, job_name):
    batch_v1 = get_batch_v1_api()
    core_v1 = get_core_v1_api()
    logger.info(f'Deleting job {job_name} in namespace {namespace}')
    # Delete associated pods
    pods = core_v1.list_namespaced_pod(namespace, label_selector=f"job-name={job_name}").items
    for pod in pods:
        core_v1.delete_namespaced_pod(name=pod.metadata.name, namespace=namespace)
        logger.debug(f'Deleted pod {pod.metadata.name}')
    # Delete the job
    try:
        batch_v1.delete_namespaced_job(name=job_name, namespace=namespace)
        logger.info(f'Deleted job {job_name}')
        return jsonify({'message': 'Job and associated pods deleted successfully'})
    except client.rest.ApiException as e:
        logger.error(f'Error deleting job {job_name}: {e}')
        return jsonify({'error': 'Error deleting job'}), 500

@cronjobs_bp.route('/edit-cronjob/<namespace>/<cronjob_name>', methods=['POST'])
def edit_cronjob(namespace, cronjob_name):
    new_schedule = request.json.get('schedule')
    logger.info(f'Updating schedule for cronjob {cronjob_name} in namespace {namespace} to {new_schedule}')
    if not is_valid_cron_expression(new_schedule): 
        logger.error('Invalid cron expression')
        return jsonify({'error': 'Invalid cron expression'}), 400
    else:
        batch_v1 = get_batch_v1_api()
        logger.info(f'Updating schedule for cronjob {cronjob_name} in namespace {namespace} to {new_schedule}')
        cronjob = batch_v1.read_namespaced_cron_job(name=cronjob_name, namespace=namespace)
        logger.debug(f'Current schedule: {cronjob.spec.schedule}')
        cronjob.spec.schedule = new_schedule
        try:
            batch_v1.patch_namespaced_cron_job(name=cronjob_name, namespace=namespace, body=cronjob)
            return jsonify({'message': 'CronJob schedule updated successfully'})
        except client.rest.ApiException as e:
            logger.error(f'Error updating cronjob: {e}')
            return jsonify({'error': 'Error updating cronjob'}), 500
