import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Modal } from './Modal' // Asegúrate de que exista este componente
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Trip } from '../types'

type HistoryPanelProps = {
  userProfile: any // adaptalo a tu modelo; debe incluir role y company_id
}

type GPSPointDB = {
  id?: number
  trip_id: string
  latitude: number
  longitude: number
  speed: number
  company_id: string | null
  created_at?: string
}

export default function HistoryPanel({ userProfile }: HistoryPanelProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [points, setPoints] = useState<GPSPointDB[]>([])
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const tripLoadTimer = useRef<number | null>(null)

  // Real-time: suscripción a gps_points usando Supabase v2 channel
  useEffect(() => {
    fetchTrips()

    const companyFilter = userProfile?.company_id
    const channel = supabase.channel('gps_points_updates')
    channel
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gps_points' },
        payload => {
          const newPoint = payload.new as GPSPointDB
          if (!newPoint) return
          if (companyFilter && newPoint.company_id !== companyFilter) return
          if (selectedTrip && selectedTrip.id === newPoint.trip_id) {
            loadPointsForTrip(newPoint.trip_id)
          }
        }
      )
      .subscribe()

return () => { channel.unsubscribe(); };  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile, selectedTrip?.id])

  // Abrir modal al seleccionar un viaje
  useEffect(() => {
    if (selectedTrip) {
      console.log("Viaje seleccionado:", selectedTrip.id)
      setModalOpen(true)
      initMapIfNeeded()
      // Debounce para evitar abortos/rct de conexión al cargar puntos
      if (tripLoadTimer.current) window.clearTimeout(tripLoadTimer.current)
      tripLoadTimer.current = window.setTimeout(() => loadPointsForTrip(selectedTrip.id), 500)
    } else {
      // limpiar timer si se deselecciona
      if (tripLoadTimer.current) {
        window.clearTimeout(tripLoadTimer.current)
        tripLoadTimer.current = null
      }
    }
    return () => {
      if (tripLoadTimer.current) window.clearTimeout(tripLoadTimer.current)
    }
  }, [selectedTrip])

  // Configurar mapa
  function initMapIfNeeded() {
    if (!mapContainerRef.current) return
    if (mapRef.current) return
    mapRef.current = L.map(mapContainerRef.current).setView([0, 0], 2)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current!)
  }

  function clearMap() {
    if (mapRef.current) {
      mapRef.current.eachLayer((layer) => {
        if ((layer as any).remove) (layer as any).remove()
      })
      mapRef.current.remove()
      mapRef.current = null
    }
  }

  function drawPathOnMap(pointsToPlot: GPSPointDB[]) {
    const map = mapRef.current
    if (!map) return
    map.eachLayer(l => {
      if ((l as any).predefined) map.removeLayer(l)
    })
    if (pointsToPlot.length === 0) return
    const coords = pointsToPlot.map(p => [p.latitude, p.longitude] as [number, number])
    const polyline = L.polyline(coords, { color: 'red' }).addTo(map)
    map.fitBounds(polyline.getBounds())
    pointsToPlot.forEach(p => {
      const marker = L.circleMarker([p.latitude, p.longitude], { radius: 3, color: 'blue' }).addTo(map)
      marker.bindTooltip(`Speed: ${p.speed} km/h`, { permanent: false, direction: 'top' })
    })
  }

  async function fetchTrips() {
    setLoading(true)
    let q = supabase.from('trips').select('*')
    if (userProfile?.role !== 'admin') {
      q = q.eq('company_id', userProfile?.company_id)
    }
    const { data, error } = await q.order('start_time', { ascending: true })
    if (error) {
      console.error('Error fetching trips', error)
      setTrips([])
    } else {
      setTrips(data as Trip[])
    }
    setLoading(false)
  }

  async function loadPointsForTrip(tripId: string) {
    const { data, error } = await supabase.from('gps_points').select('*').eq('trip_id', tripId).order('created_at')
    if (error) {
      console.error('Error loading gps_points for trip', error)
      setPoints([])
    } else {
      setPoints(data as GPSPointDB[])
      drawPathOnMap(data as GPSPointDB[])
    }
  }

  function closeModal() {
    setModalOpen(false)
    setSelectedTrip(null)
    setPoints([])
    clearMap()
  }

  // Carga de trips al inicio
  useEffect(() => {
    fetchTrips()
  }, [userProfile])

  if (loading) return <div>Loading trips…</div>

  return (
    <div>
      <h2>Historial de Viajes</h2>
      <div className="trip-list">
        {trips.map(t => (
          <div key={t.id} onClick={() => setSelectedTrip(t)} style={{ cursor: 'pointer', padding: '8px', border: '1px solid #ccc', margin: '6px 0' }}>
            <strong>Trip {t.id}</strong> - {t.start_time} - {t.status}
          </div>
        ))}
      </div>

      {modalOpen && selectedTrip && (
        <Modal onClose={closeModal} title={`Trip ${selectedTrip.id} Details`}>
          {/* Mapa con altura explícita y z-index alto para Leaflet */}
          <div id={`map-${selectedTrip.id}`} style={{ height: 400, width: '100%', zIndex: 9999 }} ref={mapContainerRef} />
          <div style={{ paddingTop: 8 }}>
            <strong>Points:</strong> {points.length}
          </div>
        </Modal>
      )}
    </div>
  )
}
