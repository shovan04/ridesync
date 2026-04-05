import numpy as np

TIMESTEPS = 120

def generate_normal():
    acc = np.random.normal(9.8, 2, (TIMESTEPS, 3))
    gyro = np.random.normal(0, 0.5, (TIMESTEPS, 3))
    speed = np.linspace(30, 50, TIMESTEPS)
    return np.hstack([acc, gyro, speed.reshape(-1,1)]), 0


def generate_brake():
    acc = np.random.normal(9.8, 2, (TIMESTEPS, 3))
    acc[-20:] += np.random.normal(-10, 3, (20, 3))
    gyro = np.random.normal(0, 1, (TIMESTEPS, 3))
    speed = np.linspace(50, 5, TIMESTEPS)
    return np.hstack([acc, gyro, speed.reshape(-1,1)]), 0


def generate_crash():
    acc = np.random.normal(9.8, 2, (TIMESTEPS, 3))
    acc[80:90] += np.random.normal(40, 12, (10, 3))

    gyro = np.random.normal(0, 0.5, (TIMESTEPS, 3))
    gyro[80:90] += np.random.normal(25, 10, (10, 3))

    speed = np.linspace(60, 0, TIMESTEPS)
    speed[90:] = 0

    return np.hstack([acc, gyro, speed.reshape(-1,1)]), 1


def generate_phone_drop():
    acc = np.random.normal(9.8, 2, (TIMESTEPS, 3))
    acc[60:70] += np.random.normal(25, 5, (10, 3))

    gyro = np.random.normal(0, 2, (TIMESTEPS, 3))
    speed = np.zeros(TIMESTEPS)

    return np.hstack([acc, gyro, speed.reshape(-1,1)]), 0


def create_dataset(n=5000):
    X, y = [], []

    for _ in range(n):
        choice = np.random.choice(
            ["normal", "brake", "crash", "phone"],
            p=[0.25, 0.25, 0.3, 0.2]
        )

        if choice == "normal":
            d, l = generate_normal()
        elif choice == "brake":
            d, l = generate_brake()
        elif choice == "crash":
            d, l = generate_crash()
        else:
            d, l = generate_phone_drop()

        X.append(d)
        y.append(l)

    return np.array(X), np.array(y)