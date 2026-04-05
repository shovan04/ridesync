import numpy as np

def extract_features(sample):
    acc = np.sqrt(sample[:,0]**2 + sample[:,1]**2 + sample[:,2]**2)

    return [
        np.mean(acc),
        np.max(acc),
        np.std(acc),
        np.max(np.abs(sample[:,3:6])),
        np.mean(sample[:,6]),
        np.min(sample[:,6]),
        np.max(sample[:,6]),
        np.mean(acc[-10:])
    ]