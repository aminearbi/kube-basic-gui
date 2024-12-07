from kubernetes import client, config

def load_kube_config():
    config.load_kube_config()

def get_core_v1_api():
    return client.CoreV1Api()

def get_apps_v1_api():
    return client.AppsV1Api()

def get_batch_v1_api():
    return client.BatchV1Api()
