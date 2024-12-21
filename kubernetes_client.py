from kubernetes import client, config
from croniter import croniter
from datetime import datetime

def is_valid_cron_expression(cron_expression):
    try:
        croniter(cron_expression, datetime.now())
        logger.debug('Cron expression is valid')
        return True
    except (ValueError, KeyError):
        logger.error('Cron expression is invalid')
        return False


def load_kube_config():
    config.load_kube_config()

def get_core_v1_api():
    return client.CoreV1Api()

def get_apps_v1_api():
    return client.AppsV1Api()

def get_batch_v1_api():
    return client.BatchV1Api()
