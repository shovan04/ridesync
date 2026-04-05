const API_BASE_URL = 'https://bwz7qdx8-8090.inc1.devtunnels.ms/api/v1'

export async function createUser(data: {
  name: string
  age: number
  email: string
  phone: string
  emergencyContact: string
  address: string
  bloodGroup: string
  gender: string
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.data[0]
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export async function getUser(userId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/user/${userId}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('Error getting user:', error)
    throw error
  }
}

export async function createRide(data: {
  userId: string
  startPoint: string
  endPoint: string
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/rides`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('Error creating ride:', error)
    throw error
  }
}

export async function joinRide(data: {
  userId: string
  rideCode: string
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/rides/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('Error joining ride:', error)
    throw error
  }
}

export async function getRideByCode(rideCode: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/rides/code/${rideCode}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('Error getting ride details:', error)
    throw error
  }
}

export async function startRide(rideId: string, userId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/rides/${rideId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('Error starting ride:', error)
    throw error
  }
}

export async function addRideStop(data: {
  rideId: string
  title: string
  stopType: 'fuel' | 'food' | 'rest' | 'tea' | 'other'
  stopPoint: string
  latitude: string
  longitude: string
  stopOrder: number
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/rides/stops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('Error adding ride stop:', error)
    throw error
  }
}

