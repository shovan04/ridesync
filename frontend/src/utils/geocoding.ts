export async function geocodeLocation(location: string): Promise<string> {
  try {
    const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(location)}&key=demo`)

    if (!response.ok) {
      throw new Error('Geocoding failed')
    }

    const data = await response.json()

    if (data.results && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry
      return `${lat},${lng}`
    }

    throw new Error('Location not found')
  } catch (error) {
    console.error('Geocoding error:', error)
    throw new Error('Failed to geocode location')
  }
}