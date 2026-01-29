import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Modal } from './Modal'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Trip } from '../types'
import { UserProfile } from '../types'

type HistoryPanelProps = {
  trips?: Trip[]
  user?: UserProfile | null
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

export default function HistoryPanel({ user }: HistoryPanelProps) {
  const [trips, setTrips] = useState<Trip[]>([])

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [points, setPoints] = useState<GPSPointDB[]>([])
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  // Real-time: Suscripción con Supabase v2 (Postgres Changes)
  useEffect(() => {
    fetchTrips()
    const channel = supabase.channel('gps_updates')
    channel.on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'gps_points' },
      payload => {
        const newPoint = payload.new as GPSPointDB
        if (!newPoint) return
        if (user?.company_id && newPoint.company_id !== user.company_id) return
        if (selectedTrip && selectedTrip.id === newPoint.trip_id) {
          loadPointsForTrip(newPoint.trip_id)
        }
      }
    ).subscribe()
    // cleanup con llaves
    return () => { channel.unsubscribe() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedTrip?.id])

  // Abrir modal al seleccionar un viaje
  useEffect(() => {
    if (selectedTrip) {
      console.log("Viaje seleccionado:", selectedTrip.id)
      setModalOpen(true)
      initMapIfNeeded()
      loadPointsForTrip(selectedTrip.id)
      if (mapRef.current) mapRef.current.invalidateSize?.()
    }
  }, [selectedTrip])

  // Inicializar mapa
  function initMapIfNeeded() {
    if (!mapContainerRef.current) return
    if (mapRef.current) return
    mapRef.current = L.map(mapContainerRef.current).setView([0, 0], 2)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current!)
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
    let q = supabase.from('trips').select('*')
    if (user?.role !== 'admin') q = q.eq('company_id', user?.company_id)
    const { data, error } = await q.order('start_time', { ascending: true })
    if (error) {
      console.error('Error fetching trips', error)
      setTrips([])
    } else {
      setTrips(data as Trip[])
    }
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
  }

  useEffect(() => { fetchTrips() }, [user])

  const mapContainerStyle: React.CSSProperties = { height: 400, width: '100%', zIndex: 1000 }

  return (
    <div>
      <h2>Historial de Viajes</h2>
      <div className="trip-list">
        {trips.map(t => (
          <div key={t.id} onClick={() => setSelectedTrip(t)} style={{ cursor: 'pointer', padding: 8, border: '1px solid #ccc', margin: '6px 0' }}>
            <strong>Trip {t.id}</strong> - {t.start_time} - {t.status}
          </div>
        ))}
      </div>

      {modalOpen && selectedTrip && (
        <Modal onClose={closeModal} title={`Trip ${selectedTrip.id} Details`}>
          <div id={`map-${selectedTrip.id}`} style={mapContainerStyle} ref={mapContainerRef} />
          <div style={{ paddingTop: 8 }}>
            <strong>Points:</strong> {points.length}
          </div>
        </Modal>
      )}
    </div>
  )
}
