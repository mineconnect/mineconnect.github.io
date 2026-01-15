import { Alert, Button, StyleSheet, Text, TextInput, View, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import { useState, useEffect, useRef } from 'react';
import { supabase, saveLocationUpdate } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { NavigationContainer, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Location from 'expo-location';

const Stack = createNativeStackNavigator();

// Define a custom dark theme for the navigation container
const CustomDarkTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: '#FFA500', // Accent color for primary elements
    background: '#121212', // Overall dark background
    card: '#1e1e1e', // Background for cards, headers
    text: '#E0E0E0', // Light text color
    border: '#333333', // Border color
    notification: '#FFA500', // Notification/badge color
  },
};

// Helper function to generate a simple UUID
function generateUUID(): string {
  let d = new Date().getTime(); //Timestamp
  // Use performance.now() if available, otherwise 0
  let d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    let r = Math.random() * 16; //random number between 0 and 16
    if (d > 0) { //Use timestamp until depleted
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else { //Use microseconds since page-load if available
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}


export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingSession(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  if (loadingSession) {
    return (
      <View style={appStyles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomDarkTheme.colors.primary} />
        <Text style={appStyles.loadingText}>Cargando sesión...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={CustomDarkTheme}>
      <Stack.Navigator screenOptions={{
        headerStyle: {
          backgroundColor: CustomDarkTheme.colors.card,
        },
        headerTintColor: CustomDarkTheme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
        {session && session.user ? (
          <Stack.Screen name="Home" options={{ title: 'Dashboard Minero' }}>
            {props => <HomeScreen {...props} userId={session.user?.id} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Define props interface for HomeScreen
interface HomeScreenProps {
  userId: string;
}

function HomeScreen({ userId }: HomeScreenProps) {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null); // New state for tripId
  const subscriberRef = useRef<Location.LocationSubscription | null>(null); // Use ref for subscriber

  // Function to start actual location tracking
  const startLocationUpdates = async (tripIdToUse: string) => {
    setLoadingLocation(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permiso de acceso a la ubicación denegado.');
      setLoadingLocation(false);
      return;
    }

    if (!userId) { // Do not proceed if userId is not available
      console.warn("User ID not available, cannot start location tracking.");
      setErrorMsg("Error: ID de usuario no disponible. Inicie sesión nuevamente.");
      setLoadingLocation(false);
      return;
    }

    subscriberRef.current = await Location.watchPositionAsync( // Assign to ref
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        setLocation(location);
        // Use the dynamically generated tripId and provided userId
        saveLocationUpdate(tripIdToUse, userId, location.coords.latitude, location.coords.longitude, location.coords.speed);
      }
    );
    setLoadingLocation(false);
  };

  useEffect(() => {
    if (tracking) {
        if (!currentTripId) { // If starting tracking and no tripId exists, generate a new one
            const newId = generateUUID();
            setCurrentTripId(newId);
            startLocationUpdates(newId);
        } else { // If tracking is already on and tripId exists, continue tracking with it
            startLocationUpdates(currentTripId);
        }
    } else {
        // Stop tracking logic
        if (subscriberRef.current) { // Check ref for current subscriber
            subscriberRef.current.remove();
            subscriberRef.current = null; // Clear ref
        }
        setLocation(null);
        setErrorMsg(null);
        setLoadingLocation(false);
        setCurrentTripId(null); // Reset tripId when tracking stops
    }

    // Cleanup function for the effect
    return () => {
        if (subscriberRef.current) { // Cleanup using ref
            subscriberRef.current.remove();
            subscriberRef.current = null;
        }
    };
  }, [tracking, currentTripId, userId]); // Add userId to dependencies


  const handleToggleTracking = () => {
    setTracking(prev => !prev);
  };

  return (
    <View style={homeStyles.container}>
      <Text style={homeStyles.title}>Estado del Equipo</Text>
      {loadingLocation && !location ? (
        <ActivityIndicator size="small" color={CustomDarkTheme.colors.primary} />
      ) : errorMsg ? (
        <Text style={homeStyles.errorText}>{errorMsg}</Text>
      ) : location ? (
        <View style={homeStyles.locationInfo}>
          <Text style={homeStyles.locationText}>Latitud: {location.coords.latitude.toFixed(6)}</Text>
          <Text style={homeStyles.locationText}>Longitud: {location.coords.longitude.toFixed(6)}</Text>
          {location.coords.speed !== null && (
            <Text style={homeStyles.locationText}>Velocidad: {(location.coords.speed * 3.6).toFixed(2)} km/h</Text>
          )}
          <Text style={homeStyles.statusText}>Reportando ubicación (ID: {currentTripId?.substring(0, 8)}...)</Text>
          <Text style={homeStyles.statusText}>UserID: {userId?.substring(0, 8)}...</Text>
        </View>
      ) : (
        <Text style={homeStyles.noLocationText}>Ubicación no disponible. Inicie el seguimiento.</Text>
      )}

      <TouchableOpacity
        style={[homeStyles.button, tracking ? homeStyles.stopButton : homeStyles.startButton]}
        onPress={handleToggleTracking}
      >
        <Text style={homeStyles.buttonText}>
          {tracking ? 'Detener Seguimiento' : 'Iniciar Seguimiento'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={homeStyles.signOutButton} onPress={() => supabase.auth.signOut()}>
        <Text style={homeStyles.signOutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Error de Autenticación', error.message);
    setLoading(false);
  }

  return (
    <View style={loginStyles.container}>
      <Text style={loginStyles.title}>MineConnect SAT</Text>
      <Text style={loginStyles.subtitle}>Acceso de Operadores</Text>

      <TextInput
        style={loginStyles.input}
        onChangeText={setEmail}
        value={email}
        placeholder="Correo electrónico"
        placeholderTextColor="#999999"
        autoCapitalize={'none'}
        keyboardType="email-address"
        autoCorrect={false}
      />
      <TextInput
        style={loginStyles.input}
        onChangeText={setPassword}
        value={password}
        secureTextEntry={true}
        placeholder="Contraseña"
        placeholderTextColor="#999999"
        autoCapitalize={'none'}
        autoCorrect={false}
      />
      <TouchableOpacity style={loginStyles.button} onPress={signInWithEmail} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={loginStyles.buttonText}>Iniciar Sesión</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const appStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CustomDarkTheme.colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: CustomDarkTheme.colors.text,
    fontSize: 16,
  },
});

const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CustomDarkTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: CustomDarkTheme.colors.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: CustomDarkTheme.colors.text,
    marginBottom: 40,
  },
  input: {
    height: 50,
    backgroundColor: CustomDarkTheme.colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CustomDarkTheme.colors.border,
    paddingHorizontal: 15,
    marginBottom: 15,
    color: CustomDarkTheme.colors.text,
    width: '100%',
    fontSize: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  button: {
    backgroundColor: CustomDarkTheme.colors.primary,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CustomDarkTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CustomDarkTheme.colors.primary,
    marginBottom: 20,
  },
  locationInfo: {
    backgroundColor: CustomDarkTheme.colors.card,
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    alignItems: 'flex-start',
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  locationText: {
    fontSize: 16,
    color: CustomDarkTheme.colors.text,
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
    color: CustomDarkTheme.colors.primary,
    marginTop: 10,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
  },
  noLocationText: {
    fontSize: 16,
    color: CustomDarkTheme.colors.text,
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  startButton: {
    backgroundColor: '#28a745', // Green start button
  },
  stopButton: {
    backgroundColor: '#dc3545', // Red stop button
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  signOutButton: {
    backgroundColor: CustomDarkTheme.colors.card, // Dark background for sign out
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    marginTop: 10,
    borderWidth: 1,
    borderColor: CustomDarkTheme.colors.border,
  },
  signOutButtonText: {
    color: CustomDarkTheme.colors.text,
    fontSize: 16,
  },
});