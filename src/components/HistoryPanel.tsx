import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Modal } from './Modal'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Trip } from '../types'
import { UserProfile } from '../types'
import { MapPin, Calendar, Clock, Activity, Navigation, Satellite } from 'lucide-react'

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

  // Inicializar mapa con estilo dark
  function initMapIfNeeded() {
    if (!mapContainerRef.current) return
    if (mapRef.current) return
    
    mapRef.current = L.map(mapContainerRef.current).setView([0, 0], 2)
    
    // Dark mode tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(mapRef.current!)
  }

  function drawPathOnMap(pointsToPlot: GPSPointDB[]) {
    const map = mapRef.current
    if (!map) return
    
    // Clear existing layers except base tiles
    map.eachLayer(l => {
      if ((l as any)._url) return // Keep tile layers
      map.removeLayer(l)
    })
    
    if (pointsToPlot.length === 0) return
    
    const coords = pointsToPlot.map(p => [p.latitude, p.longitude] as [number, number])
    
    // Add gradient polyline
    const polyline = L.polyline(coords, { 
      color: '#3B82F6',
      weight: 3,
      opacity: 0.8,
      smoothFactor: 1
    }).addTo(map)
    
    // Add markers with custom icons
    pointsToPlot.forEach((p, index) => {
      const isStart = index === 0
      const isEnd = index === pointsToPlot.length - 1
      
      if (isStart || isEnd) {
        const icon = L.divIcon({
          html: `<div class="custom-marker ${isStart ? 'start' : 'end'}">${isStart ? '🚀' : '📍'}</div>`,
          className: 'custom-div-icon',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
        
        L.marker([p.latitude, p.longitude], { icon })
          .addTo(map)
          .bindTooltip(`${isStart ? 'Inicio' : 'Fin'} - Vel: ${p.speed} km/h`, {
            permanent: false,
            direction: 'top',
            className: 'custom-tooltip'
          })
      } else {
        L.circleMarker([p.latitude, p.longitude], { 
          radius: 2, 
          color: '#60A5FA',
          fillColor: '#3B82F6',
          fillOpacity: 0.6
        }).addTo(map)
      }
    })
    
    map.fitBounds(polyline.getBounds(), { padding: [50, 50] })
  }

  async function fetchTrips() {
    let q = supabase.from('trips').select('*')
    if (user?.role !== 'admin') q = q.eq('company_id', user?.company_id)
    const { data, error } = await q.order('start_time', { ascending: false })
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

  const getStatusBadge = (status: string) => {
    const styles = {
      'en_curso': 'bg-green-500/20 text-green-400 border-green-500/30',
      'finalizado': 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
    return styles[status as keyof typeof styles] || styles.finalizado
  }

  return (
    <div className="h-full flex">
      {/* Left Panel - Trip List */}
      <div className="w-1/3 bg-slate-900/50 backdrop-blur-sm border-r border-slate-800/50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Navigation className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Monitor de Viajes</h2>
          </div>

          <div className="space-y-3">
            {trips.length === 0 ? (
              <div className="text-center py-12">
                <Satellite className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No hay viajes registrados</p>
              </div>
            ) : (
              trips.map(trip => (
                <div
                  key={trip.id}
                  onClick={() => setSelectedTrip(trip)}
                  className="group cursor-pointer bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:bg-slate-800/70 hover:shadow-lg hover:shadow-blue-500/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-mono text-blue-300">{trip.id.substring(0, 8)}</span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(trip.status)}`}>
                      {trip.status === 'en_curso' ? 'En Curso' : 'Finalizado'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(trip.start_time).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(trip.start_time).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Activity className="w-3 h-3" />
                      <span>Max: {trip.max_speed} km/h</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Activity className="w-3 h-3" />
                      <span>Prom: {trip.avg_speed} km/h</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <div className="text-xs text-slate-500">
                      Vehículo: {trip.plate} | Conductor: {trip.driver_name}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Map */}
      <div className="flex-1 relative bg-slate-900/30">
        {!selectedTrip && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">Selecciona un viaje</p>
              <p className="text-slate-500 text-sm">para ver la ruta en el mapa</p>
            </div>
          </div>
        )}

        {selectedTrip && (
          <div className="h-full">
            {/* Trip Info Header */}
            <div className="absolute top-4 left-4 right-4 z-10 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Viaje {selectedTrip.id.substring(0, 8)}</h3>
                  <div className="flex items-center space-x-4 text-sm text-slate-400">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{selectedTrip.plate}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Activity className="w-3 h-3" />
                      <span>{selectedTrip.driver_name}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-400">{points.length}</div>
                  <div className="text-xs text-slate-400">Puntos GPS</div>
                </div>
              </div>
            </div>

            {/* Map Container */}
            <div 
              ref={mapContainerRef} 
              className="w-full h-full"
              style={{ paddingTop: '80px' }}
            />
          </div>
        )}
      </div>

      {/* Modal for detailed view (optional) */}
      {modalOpen && selectedTrip && (
        <Modal onClose={closeModal} title={`Viaje ${selectedTrip.id.substring(0, 8)} - Detalles Completos`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Velocidad Máxima</div>
                <div className="text-xl font-bold text-white">{selectedTrip.max_speed} km/h</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Velocidad Promedio</div>
                <div className="text-xl font-bold text-white">{selectedTrip.avg_speed} km/h</div>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-2">Puntos Registrados</div>
              <div className="text-lg font-semibold text-blue-400">{points.length} puntos GPS</div>
            </div>
          </div>
        </Modal>
      )}

      <style>{`
        .custom-marker {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          border-radius: 50%;
        }
        .custom-marker.start {
          background: rgba(34, 197, 94, 0.2);
          border: 2px solid #22c55e;
        }
        .custom-marker.end {
          background: rgba(239, 68, 68, 0.2);
          border: 2px solid #ef4444;
        }
        .custom-tooltip {
          background: rgba(15, 23, 42, 0.9) !important;
          border: 1px solid rgba(51, 65, 85, 0.5) !important;
          color: #e2e8f0 !important;
          font-size: 12px !important;
        }
        .custom-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  )
}