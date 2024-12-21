from flask import Blueprint, jsonify, request
from kubernetes_client import get_batch_v1_api, get_core_v1_api
from kubernetes import client, config
from kubernetes.client import V1Job, V1ObjectMeta, V1JobSpec, V1PodTemplateSpec, V1PodSpec, V1Container
from kubernetes_client import is_valid_cron_expression

cronjobs_bp = Blueprint('cronjobs', __name__)



@cronjobs_bp.route('/cronjobs/<namespace>')
def get_cronjobs(namespace):
    batch_v1 = get_batch_v1_api()
    cronjobs = batch_v1.list_namespaced_cron_job(namespace).items
    logger.info(f'Found {len(cronjobs)} cronjobs in namespace {namespace}')
    cronjob_list = [{'name': cj.metadata.name, 'schedule': cj.spec.schedule} for cj in cronjobs]
    logger.debug(f'Cronjobs: {cronjob_list}')
    return jsonify({'cronjobs': cronjob_list})


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

