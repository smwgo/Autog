"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getClientActiveBranch } from "@/lib/branch";
import {
  MULTIMEDIA_CONFIG,
  comprimirImagenEnNavegador,
  subirEvidenciaSegura,
  eliminarEvidenciaSegura,
  UploadProgressInfo,
} from "@/lib/storage-client";
import {
  VoiceNoteRecord,
  TranscriptionStatus,
  BrowserSpeechRecognitionProvider,
  getBestSupportedAudioMimeType,
} from "@/lib/transcription";

export interface ModalNuevaOrdenProps {
  isOpen?: boolean;
  onClose?: () => void;
  empleadoLogueado?: { id: string; nombre: string; rol?: string };
  mecanicos?: string[];
  clientesCatalogo?: any[];
  onOrdenCreada?: (nuevaOrden: any, cliente?: any, tipo?: "Taller" | "Lubricentro" | "Lavado") => void;
  mostrarToast?: (msg: string, tipo?: "ok" | "err") => void;
  isPageMode?: boolean;
  placaInicial?: string;
  clienteInicial?: string;
  editOrderId?: string;
}

// Catálogo de Marcas y Modelos populares en la región
const CATALOGO_VEHICULOS: Record<string, { modelos: string[]; tipo?: string }> = {
  Toyota: {
    modelos: ["Hilux", "Fortuner", "Corolla", "RAV4", "Yaris", "Land Cruiser", "Prado", "4Runner", "Rush", "Prius", "Avanza", "Tacoma", "Hiace"],
    tipo: "Camioneta",
  },
  Chevrolet: {
    modelos: ["D-Max", "Sail", "Aveo", "Tracker", "Captiva", "Spark", "Onix", "Grand Vitara", "Trailblazer", "Silverado", "Tahoe", "Colorado", "Cruze"],
    tipo: "Auto",
  },
  Hyundai: {
    modelos: ["Tucson", "Santa Fe", "Accent", "Elantra", "Creta", "Grand i10", "H-1", "Kona", "Venue", "Staria", "Sonata"],
    tipo: "SUV",
  },
  Kia: {
    modelos: ["Sportage", "Rio", "Picanto", "Seltos", "Cerato", "Sorento", "Soluto", "Sonet", "Carnival", "K3", "Stonic"],
    tipo: "SUV",
  },
  Nissan: {
    modelos: ["Frontier", "Sentra", "Versa", "Qashqai", "X-Trail", "Kicks", "March", "Tiida", "Pathfinder", "Patrol", "Navara"],
    tipo: "Camioneta",
  },
  Ford: {
    modelos: ["Ranger", "F-150", "Explorer", "Escape", "EcoSport", "Fiesta", "Focus", "Everest", "Bronco", "Edge"],
    tipo: "Camioneta",
  },
  Volkswagen: {
    modelos: ["Amarok", "Gol", "Polo", "Golf", "Tiguan", "T-Cross", "Taos", "Jetta", "Saveiro", "Virtus", "Voyage"],
    tipo: "Auto",
  },
  Mazda: {
    modelos: ["BT-50", "Mazda 2", "Mazda 3", "Mazda 6", "CX-3", "CX-30", "CX-5", "CX-9", "CX-50"],
    tipo: "SUV",
  },
  Renault: {
    modelos: ["Duster", "Logan", "Sandero", "Stepway", "Koleos", "Kwid", "Oroch", "Master", "Captur"],
    tipo: "SUV",
  },
  Suzuki: {
    modelos: ["Grand Vitara", "Vitara", "Jimny", "Swift", "S-Cross", "Alto", "Celerio", "Baleno", "Ertiga", "Dzire"],
    tipo: "SUV",
  },
  Mitsubishi: {
    modelos: ["L200", "Montero", "Outlander", "ASX", "Eclipse Cross", "Mirage", "Sportero", "Pajero"],
    tipo: "Camioneta",
  },
  "Great Wall": {
    modelos: ["Poer", "Wingle 5", "Wingle 7", "Haval H6", "Haval Jolion", "Haval H2", "M4"],
    tipo: "Camioneta",
  },
  Chery: {
    modelos: ["Tiggo 2", "Tiggo 4", "Tiggo 7 Pro", "Tiggo 8 Pro", "Arrizo 5"],
    tipo: "SUV",
  },
  JAC: {
    modelos: ["T6", "T8", "T8 Pro", "JS2", "JS3", "JS4", "JS8"],
    tipo: "Camioneta",
  },
  Honda: {
    modelos: ["CR-V", "Civic", "HR-V", "Accord", "Pilot", "Fit", "WR-V"],
    tipo: "SUV",
  },
  Peugeot: {
    modelos: ["208", "2008", "3008", "5008", "Partner", "308", "Boxer"],
    tipo: "Auto",
  },
  Jeep: {
    modelos: ["Grand Cherokee", "Wrangler", "Compass", "Renegade", "Gladiator", "Cherokee"],
    tipo: "SUV",
  },
  BMW: {
    modelos: ["Serie 1", "Serie 3", "Serie 5", "X1", "X3", "X5", "X6"],
    tipo: "Auto",
  },
  "Mercedes-Benz": {
    modelos: ["Clase A", "Clase C", "Clase E", "GLA", "GLC", "GLE", "Sprinter"],
    tipo: "Auto",
  },
  Audi: {
    modelos: ["A3", "A4", "A6", "Q3", "Q5", "Q7", "Q8"],
    tipo: "Auto",
  },
  Hino: {
    modelos: ["Dutro", "Serie 300", "Serie 500", "FC", "GD", "GH"],
    tipo: "Camión",
  },
  Isuzu: {
    modelos: ["D-Max", "NPR", "NKR", "NNR", "FVR", "Forward"],
    tipo: "Camión",
  },
  Yamaha: {
    modelos: ["FZ 2.0", "Crypton", "XTZ 125", "XTZ 250", "MT-03", "MT-07", "NMAX", "BWS"],
    tipo: "Moto",
  },
  Bajaj: {
    modelos: ["Pulsar NS200", "Pulsar 150", "Discover 125", "Boxer 150", "Dominar 400", "Torito"],
    tipo: "Moto",
  },
};

const detectarCarroceria = (modelo: string, marca: string): string => {
  const m = modelo.toLowerCase();
  const mc = marca.toLowerCase();
  if (
    m.includes("hilux") ||
    m.includes("d-max") ||
    m.includes("ranger") ||
    m.includes("f-150") ||
    m.includes("poer") ||
    m.includes("wingle") ||
    m.includes("l200") ||
    m.includes("frontier") ||
    m.includes("silverado") ||
    m.includes("colorado") ||
    m.includes("bt-50") ||
    m.includes("amarok") ||
    m.includes("saveiro") ||
    m.includes("oroch") ||
    m.includes("gladiator") ||
    m.includes("t6") ||
    m.includes("t8")
  ) {
    return "Camioneta";
  }
  if (
    m.includes("tucson") ||
    m.includes("sportage") ||
    m.includes("rav4") ||
    m.includes("duster") ||
    m.includes("tracker") ||
    m.includes("captiva") ||
    m.includes("tiggo") ||
    m.includes("seltos") ||
    m.includes("creta") ||
    m.includes("kicks") ||
    m.includes("x-trail") ||
    m.includes("qashqai") ||
    m.includes("explorer") ||
    m.includes("escape") ||
    m.includes("ecosport") ||
    m.includes("cr-v") ||
    m.includes("hr-v") ||
    m.includes("cx-5") ||
    m.includes("cx-30") ||
    m.includes("tiguan") ||
    m.includes("t-cross") ||
    m.includes("vitara") ||
    m.includes("jimny") ||
    m.includes("grand cherokee") ||
    m.includes("wrangler") ||
    m.includes("compass") ||
    m.includes("prado") ||
    m.includes("fortuner") ||
    m.includes("4runner") ||
    m.includes("santa fe") ||
    m.includes("sorento")
  ) {
    return "SUV";
  }
  if (
    m.includes("pulsar") ||
    m.includes("fz") ||
    m.includes("xtz") ||
    m.includes("crypton") ||
    m.includes("tornado") ||
    m.includes("mt-") ||
    m.includes("nmax") ||
    m.includes("bws") ||
    m.includes("dominar") ||
    m.includes("boxer") ||
    m.includes("discover") ||
    mc.includes("moto") ||
    mc.includes("bajaj") ||
    mc.includes("yamaha")
  ) {
    return "Moto";
  }
  if (
    m.includes("dutro") ||
    m.includes("serie 500") ||
    m.includes("npr") ||
    m.includes("nkr") ||
    m.includes("hino") ||
    m.includes("fvr") ||
    mc.includes("hino") ||
    mc.includes("isuzu")
  ) {
    return "Camión";
  }
  return "Auto";
};

export default function ModalNuevaOrdenTrabajo({
  isOpen = true,
  onClose,
  empleadoLogueado = { id: "emp-admin", nombre: "", rol: "Mecánico" },
  mecanicos = [],
  clientesCatalogo = [],
  onOrdenCreada,
  mostrarToast = () => { },
  isPageMode = false,
  placaInicial = "",
  clienteInicial = "",
  editOrderId = "",
}: ModalNuevaOrdenProps) {
  const router = useRouter();
  // Stepper deslizable: 1 = Cliente, 2 = Vehículo, 3 = Ingreso, 4 = Orden
  const [pasoActivo, setPasoActivo] = useState<1 | 2 | 3 | 4>(1);

  // Sincronizar placa y cliente inicial si se reciben por URL o props
  useEffect(() => {
    if (placaInicial && !vehiculoPlaca) {
      setVehiculoPlaca(placaInicial.trim().toUpperCase());
    }
    if (clienteInicial && !busquedaCliente) {
      setBusquedaCliente(clienteInicial.trim());
    }
  }, [placaInicial, clienteInicial]);

  // =========================================================================
  // PASO 1: CLIENTE
  // =========================================================================
  const [tipoCliente, setTipoCliente] = useState<"Persona" | "Empresa">("Persona");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [mostrarDropdownClientes, setMostrarDropdownClientes] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);
  const [mostrarFormNuevoCliente, setMostrarFormNuevoCliente] = useState(false);
  const [subPasoCliente, setSubPasoCliente] = useState<"tipo" | "nombre" | "identificacion" | "telefono" | "email" | "direccion">("tipo");

  // Campos del cliente nuevo (igual que en módulo Clientes)
  const [nuevoClienteIdentificacion, setNuevoClienteIdentificacion] = useState("");
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState("");
  const [nuevoClienteEmail, setNuevoClienteEmail] = useState("");
  const [nuevoClienteDireccion, setNuevoClienteDireccion] = useState("");
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [nuevoClienteFoto, setNuevoClienteFoto] = useState<string | null>(null);
  const [subiendoFotoCliente, setSubiendoFotoCliente] = useState(false);
  const [mostrarMenuFotoCliente, setMostrarMenuFotoCliente] = useState(false);
  const fileInputClienteCamaraRef = useRef<HTMLInputElement | null>(null);
  const fileInputClienteGaleriaRef = useRef<HTMLInputElement | null>(null);

  const handleFotoClienteSeleccionada = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vista previa inmediata instantánea
    try {
      const immediateUrl = URL.createObjectURL(file);
      setNuevoClienteFoto(immediateUrl);
    } catch { }

    try {
      setSubiendoFotoCliente(true);

      // Conversión a Base64 garantizada en memoria
      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;
      setNuevoClienteFoto(base64Data);

      // Respaldo en Cloudflare R2 con timeout de 3.5s
      try {
        const { file: optimizada } = await comprimirImagenEnNavegador(file);
        const uploadTask = subirEvidenciaSegura({
          archivo: optimizada,
          tipo: "foto",
          carpeta: "clientes_avatar",
          nombreArchivo: `cliente_${Date.now()}.jpg`,
          uploadedBy: ingresadoPor.trim() || empleadoLogueado.nombre,
          branch: getClientActiveBranch("/taller") === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL",
        });
        const timeoutTask = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), 3500)
        );
        const res = await Promise.race([uploadTask, timeoutTask]);
        if (res && res.url) {
          setNuevoClienteFoto(res.url);
        }
      } catch (uploadErr) {
        console.warn("Respaldo R2 omitido, persistiendo en Base64:", uploadErr);
      }

      if (mostrarToast) mostrarToast("Foto de perfil cargada", "ok");
    } catch (err: any) {
      if (mostrarToast) mostrarToast(err?.message || "Error al procesar la foto", "err");
    } finally {
      setSubiendoFotoCliente(false);
      if (fileInputClienteCamaraRef.current) fileInputClienteCamaraRef.current.value = "";
      if (fileInputClienteGaleriaRef.current) fileInputClienteGaleriaRef.current.value = "";
    }
  };

  // =========================================================================
  // PASO 2: VEHÍCULO
  // =========================================================================
  const [vehiculoSeleccionadoId, setVehiculoSeleccionadoId] = useState<string>("NUEVO");
  const [vehiculoPlaca, setVehiculoPlaca] = useState("");
  const [vehiculoMarca, setVehiculoMarca] = useState("");
  const [vehiculoModelo, setVehiculoModelo] = useState("");
  const [vehiculoAnio, setVehiculoAnio] = useState(String(new Date().getFullYear()));
  const [vehiculoKm, setVehiculoKm] = useState("");
  const [vehiculoTipo, setVehiculoTipo] = useState("Auto");
  const [mostrarFormNuevoVehiculo, setMostrarFormNuevoVehiculo] = useState(false);
  const [subPasoVehiculo, setSubPasoVehiculo] = useState<"placa" | "marca" | "modelo" | "anio" | "tipo">("placa");
  const [vehiculoFoto, setVehiculoFoto] = useState<string | null>(null);
  const [subiendoFotoVehiculo, setSubiendoFotoVehiculo] = useState(false);
  const [mostrarMenuFotoVehiculo, setMostrarMenuFotoVehiculo] = useState(false);
  const fileInputVehiculoCamaraRef = useRef<HTMLInputElement | null>(null);
  const fileInputVehiculoGaleriaRef = useRef<HTMLInputElement | null>(null);

  const handleFotoVehiculoSeleccionada = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vista previa inmediata instantánea en pantalla
    try {
      const immediateUrl = URL.createObjectURL(file);
      setVehiculoFoto(immediateUrl);
    } catch { }

    try {
      setSubiendoFotoVehiculo(true);

      // Conversión a Base64 garantizada en memoria
      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;
      setVehiculoFoto(base64Data);

      // Respaldo en Cloudflare R2 con timeout de 3.5s
      try {
        const { file: optimizada } = await comprimirImagenEnNavegador(file);
        const uploadTask = subirEvidenciaSegura({
          archivo: optimizada,
          tipo: "foto",
          carpeta: "vehiculos_avatar",
          nombreArchivo: `vehiculo_${vehiculoPlaca.trim() || "perfil"}_${Date.now()}.jpg`,
          plate: vehiculoPlaca.trim().toUpperCase() || undefined,
          uploadedBy: ingresadoPor.trim() || empleadoLogueado.nombre,
          branch: getClientActiveBranch("/taller") === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL",
        });
        const timeoutTask = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), 3500)
        );
        const res = await Promise.race([uploadTask, timeoutTask]);
        if (res && res.url) {
          setVehiculoFoto(res.url);
        }
      } catch (uploadErr) {
        console.warn("Respaldo R2 omitido, persistiendo en Base64:", uploadErr);
      }

      if (mostrarToast) mostrarToast("Foto del vehículo cargada", "ok");
    } catch (err: any) {
      console.error("Error al procesar foto vehículo:", err);
      if (mostrarToast) mostrarToast(err?.message || "Error al procesar la foto", "err");
    } finally {
      setSubiendoFotoVehiculo(false);
      if (fileInputVehiculoCamaraRef.current) fileInputVehiculoCamaraRef.current.value = "";
      if (fileInputVehiculoGaleriaRef.current) fileInputVehiculoGaleriaRef.current.value = "";
    }
  };

  // Selector flotante para Marca y Modelo
  const [mostrarFlotanteVehiculo, setMostrarFlotanteVehiculo] = useState(false);
  const [tabFlotanteVehiculo, setTabFlotanteVehiculo] = useState<"marca" | "modelo">("marca");
  const [busquedaFlotanteVehiculo, setBusquedaFlotanteVehiculo] = useState("");

  // =========================================================================
  // PASO 3 & 4: INGRESO DETALLADO Y ORDEN (COMBUSTIBLE, INVENTARIO, FOTOS, TÉCNICOS)
  // =========================================================================
  const [tipoIngreso, setTipoIngreso] = useState<"Taller" | "Lubricentro" | "Lavado">("Taller");
  const [nivelCombustible, setNivelCombustible] = useState<"E" | "1/4" | "1/2" | "3/4" | "F">("1/2");
  const [porcentajeCombustible, setPorcentajeCombustible] = useState<number>(50);

  const handleSliderCombustible = (val: number) => {
    setPorcentajeCombustible(val);
    if (val <= 12) setNivelCombustible("E");
    else if (val <= 37) setNivelCombustible("1/4");
    else if (val <= 62) setNivelCombustible("1/2");
    else if (val <= 87) setNivelCombustible("3/4");
    else setNivelCombustible("F");
  };

  const handleBotonCombustible = (lvl: "E" | "1/4" | "1/2" | "3/4" | "F") => {
    setNivelCombustible(lvl);
    const mapa: Record<string, number> = { E: 0, "1/4": 25, "1/2": 50, "3/4": 75, F: 100 };
    setPorcentajeCombustible(mapa[lvl] ?? 50);
  };
  const [inventarioTrae, setInventarioTrae] = useState<string[]>([]);
  const [listaItemsInventario, setListaItemsInventario] = useState<string[]>([
    "Gata",
    "Llave",
    "Triángulos",
    "Botiquín",
    "Extintor",
    "Repuesto",
    "Matrícula",
    "Herramientas",
  ]);
  const [itemManualInventario, setItemManualInventario] = useState("");
  const [fotosIniciales, setFotosIniciales] = useState<string[]>([]);
  const [evidenciasMetadata, setEvidenciasMetadata] = useState<
    Array<{
      url: string;
      key: string;
      evidenceId: string;
      tipo: "foto" | "video" | "audio";
      fileSizeBytes: number;
      mimeType: string;
      durationSeconds?: number;
      transcriptionText?: string;
      clientTempId: string;
    }>
  >([]);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fileInputFotosRef = useRef<HTMLInputElement | null>(null);

  const toggleInventario = (item: string) => {
    setInventarioTrae((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const agregarItemManual = () => {
    const nuevo = itemManualInventario.trim();
    if (!nuevo) return;
    if (!listaItemsInventario.includes(nuevo)) {
      setListaItemsInventario((prev) => [...prev, nuevo]);
    }
    if (!inventarioTrae.includes(nuevo)) {
      setInventarioTrae((prev) => [...prev, nuevo]);
    }
    setItemManualInventario("");
  };

  // =========================================================================
  // MULTIMEDIA: FOTOS, VIDEO CLIP CORTO Y NOTA DE VOZ
  // =========================================================================
  const [panelMultimedia, setPanelMultimedia] = useState<"foto" | "video" | "audio" | null>(null);
  const [videosIniciales, setVideosIniciales] = useState<Array<{ url: string; duracion?: number; nombre?: string }>>([]);
  const [notasVozIniciales, setNotasVozIniciales] = useState<VoiceNoteRecord[]>([]);
  const [progresoSubida, setProgresoSubida] = useState<UploadProgressInfo | null>(null);
  const [fotoEnZoom, setFotoEnZoom] = useState<string | null>(null);

  // Cámara para fotos
  const [camaraFotoActiva, setCamaraFotoActiva] = useState(false);
  const camaraFotoStreamRef = useRef<MediaStream | null>(null);
  const camaraFotoVideoRef = useRef<HTMLVideoElement | null>(null);

  // Video
  const [grabandoVideo, setGrabandoVideo] = useState(false);
  const [subiendoVideo, setSubiendoVideo] = useState(false);
  const [segundosVideo, setSegundosVideo] = useState(0);
  const [videoBlobTemp, setVideoBlobTemp] = useState<Blob | null>(null);
  const [videoUrlTemp, setVideoUrlTemp] = useState<string | null>(null);
  const [duracionVideoTemp, setDuracionVideoTemp] = useState(0);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputVideoRef = useRef<HTMLInputElement | null>(null);

  // Audio / Nota de voz
  const [grabandoAudio, setGrabandoAudio] = useState(false);
  const grabandoAudioRef = useRef(false);
  const [subiendoAudio, setSubiendoAudio] = useState(false);
  const [segundosAudio, setSegundosAudio] = useState(0);
  const [audioBlobTemp, setAudioBlobTemp] = useState<Blob | null>(null);
  const [audioUrlTemp, setAudioUrlTemp] = useState<string | null>(null);
  const [transcripcionVoz, setTranscripcionVoz] = useState("");
  const transcripcionVozRef = useRef("");
  const transcripcionUltimaAgregadaRef = useRef("");
  const [transcripcionOriginal, setTranscripcionOriginal] = useState("");
  const [estadoTranscripcion, setEstadoTranscripcion] = useState<TranscriptionStatus>("no_disponible");
  const [errorSubidaAudio, setErrorSubidaAudio] = useState<string | null>(null);
  const [audioPermisoError, setAudioPermisoError] = useState<string | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  const detenerTracksMedia = () => {
    if (videoTimerRef.current) clearInterval(videoTimerRef.current);
    if (audioTimerRef.current) clearInterval(audioTimerRef.current);

    if (camaraFotoStreamRef.current) {
      camaraFotoStreamRef.current.getTracks().forEach((t) => t.stop());
      camaraFotoStreamRef.current = null;
    }
    setCamaraFotoActiva(false);

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch { }
      speechRecognitionRef.current = null;
    }

    setGrabandoVideo(false);
    setGrabandoAudio(false);

    if (videoUrlTemp) {
      try {
        URL.revokeObjectURL(videoUrlTemp);
      } catch { }
      setVideoUrlTemp(null);
    }
    setVideoBlobTemp(null);

    if (audioUrlTemp) {
      try {
        URL.revokeObjectURL(audioUrlTemp);
      } catch { }
      setAudioUrlTemp(null);
    }
    setAudioBlobTemp(null);
  };

  useEffect(() => {
    return () => {
      detenerTracksMedia();
    };
  }, []);

  useEffect(() => {
    if (grabandoVideo && videoElementRef.current && videoStreamRef.current) {
      videoElementRef.current.srcObject = videoStreamRef.current;
      videoElementRef.current.play().catch(() => { });
    }
  }, [grabandoVideo]);

  useEffect(() => {
    if (camaraFotoActiva && camaraFotoVideoRef.current && camaraFotoStreamRef.current) {
      camaraFotoVideoRef.current.srcObject = camaraFotoStreamRef.current;
      camaraFotoVideoRef.current.play().catch(() => { });
    }
  }, [camaraFotoActiva]);

  const irAPaso = (nuevoPaso: 1 | 2 | 3 | 4) => {
    if (pasoActivo === 3 && nuevoPaso !== 3) {
      detenerTracksMedia();
      setCamaraFotoActiva(false);
      setGrabandoVideo(false);
      setGrabandoAudio(false);
      setSubiendoFoto(false);
      setSubiendoVideo(false);
      setSubiendoAudio(false);
    }
    // Cerrar escáner de matrícula al cambiar de paso
    detenerCamara();
    setMostrarEscanerMatricula(false);
    setPasoActivo(nuevoPaso);
  };

  // =========================================================================
  // FOTOGRAFÍAS: CÁMARA DIRECTA, COMPRESIÓN Y SUBIDA SEGURA R2
  // =========================================================================
  const iniciarCamaraFoto = async () => {
    try {
      if (fotosIniciales.length >= MULTIMEDIA_CONFIG.MAX_PHOTOS) {
        mostrarToast(`Límite de ${MULTIMEDIA_CONFIG.MAX_PHOTOS} fotografías alcanzado (5/5)`, "err");
        return;
      }
      detenerTracksMedia();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: MULTIMEDIA_CONFIG.VIDEO_TARGET_WIDTH },
          height: { ideal: MULTIMEDIA_CONFIG.VIDEO_TARGET_HEIGHT },
        },
      });
      camaraFotoStreamRef.current = stream;
      setCamaraFotoActiva(true);
    } catch (err: any) {
      mostrarToast(
        "No se pudo acceder a la cámara en el navegador. Puedes adjuntar fotos desde archivos.",
        "err"
      );
    }
  };

  const detenerCamaraFoto = () => {
    if (camaraFotoStreamRef.current) {
      camaraFotoStreamRef.current.getTracks().forEach((t) => t.stop());
      camaraFotoStreamRef.current = null;
    }
    setCamaraFotoActiva(false);
  };

  const capturarFotoDesdeCamara = async () => {
    const video = camaraFotoVideoRef.current;
    if (!video) return;

    try {
      setSubiendoFoto(true);
      setProgresoSubida({ percent: 20, status: "Capturando fotograma de alta nitidez..." });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || MULTIMEDIA_CONFIG.VIDEO_TARGET_WIDTH;
      canvas.height = video.videoHeight || MULTIMEDIA_CONFIG.VIDEO_TARGET_HEIGHT;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("No se pudo inicializar lienzo gráfico.");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", MULTIMEDIA_CONFIG.PHOTO_QUALITY);
      setFotosIniciales((prev) => [...prev, dataUrl].slice(0, MULTIMEDIA_CONFIG.MAX_PHOTOS));
      detenerCamaraFoto();

      setProgresoSubida({ percent: 45, status: "Optimizando compresión de imagen..." });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", MULTIMEDIA_CONFIG.PHOTO_QUALITY)
      );

      if (blob) {
        try {
          const { file: optimizada } = await comprimirImagenEnNavegador(blob);
          const uploadPromise = subirEvidenciaSegura({
            archivo: optimizada,
            tipo: "foto",
            carpeta: "taller_recepcion",
            nombreArchivo: `foto_${Date.now()}.jpg`,
            plate: vehiculoPlaca.trim().toUpperCase() || undefined,
            uploadedBy: ingresadoPor.trim() || empleadoLogueado.nombre,
            branch: getClientActiveBranch("/taller") === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL",
            onProgress: (p) => setProgresoSubida(p),
          });

          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 5000)
          );

          const res = await Promise.race([uploadPromise, timeoutPromise]);

          if (res && res.url) {
            setFotosIniciales((prev) => prev.map((url) => (url === dataUrl ? res.url : url)));
            setEvidenciasMetadata((prev) => [
              ...prev,
              {
                url: res.url,
                key: res.key,
                evidenceId: res.evidenceId,
                tipo: "foto",
                fileSizeBytes: res.fileSizeBytes,
                mimeType: res.mimeType,
                clientTempId: res.clientTempId,
              },
            ]);
            mostrarToast("Fotografía guardada y respaldada en Cloudflare R2", "ok");
          } else {
            mostrarToast("Fotografía capturada localmente", "ok");
          }
        } catch (uploadErr) {
          console.warn("Subida a R2 en background:", uploadErr);
          mostrarToast("Fotografía capturada localmente", "ok");
        }
      }
    } catch (err: any) {
      mostrarToast(err?.message || "Error al capturar fotografía", "err");
    } finally {
      setSubiendoFoto(false);
      setProgresoSubida(null);
    }
  };

  const handleSubirFotosIniciales = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (fotosIniciales.length >= MULTIMEDIA_CONFIG.MAX_PHOTOS) {
      mostrarToast(`Máximo ${MULTIMEDIA_CONFIG.MAX_PHOTOS} fotos iniciales permitidas (5/5)`, "err");
      if (fileInputFotosRef.current) fileInputFotosRef.current.value = "";
      return;
    }

    const archivos = Array.from(files);
    if (fileInputFotosRef.current) fileInputFotosRef.current.value = "";
    const espacio = MULTIMEDIA_CONFIG.MAX_PHOTOS - fotosIniciales.length;
    const aSubir = archivos.slice(0, espacio);

    // Leer inmediatamente como Base64 para que la foto nunca se pierda ni quede bloqueada
    const dataUrls: string[] = await Promise.all(
      aSubir.map(
        (f) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(URL.createObjectURL(f));
            reader.readAsDataURL(f);
          })
      )
    );

    setFotosIniciales((prev) => [...prev, ...dataUrls].slice(0, MULTIMEDIA_CONFIG.MAX_PHOTOS));

    try {
      setSubiendoFoto(true);

      await Promise.all(
        aSubir.map(async (f, i) => {
          const currentUrl = dataUrls[i];
          try {
            setProgresoSubida({
              percent: Math.round(((i + 1) / aSubir.length) * 20),
              status: `Comprimiendo imagen ${i + 1} de ${aSubir.length}...`,
            });

            const { file: optimizada } = await comprimirImagenEnNavegador(f);

            const uploadPromise = subirEvidenciaSegura({
              archivo: optimizada,
              tipo: "foto",
              carpeta: "taller_recepcion",
              nombreArchivo: f.name,
              plate: vehiculoPlaca.trim().toUpperCase() || undefined,
              uploadedBy: ingresadoPor.trim() || empleadoLogueado.nombre,
              branch: getClientActiveBranch("/taller") === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL",
              onProgress: (p) => setProgresoSubida(p),
            });

            const timeoutPromise = new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), 5000)
            );

            const res = await Promise.race([uploadPromise, timeoutPromise]);

            if (res && res.url) {
              setFotosIniciales((prev) => prev.map((url) => (url === currentUrl ? res.url : url)));
              setEvidenciasMetadata((prev) => [
                ...prev,
                {
                  url: res.url,
                  key: res.key,
                  evidenceId: res.evidenceId,
                  tipo: "foto",
                  fileSizeBytes: res.fileSizeBytes,
                  mimeType: res.mimeType,
                  clientTempId: res.clientTempId,
                },
              ]);
            }
          } catch (err: any) {
            console.warn("Subida a R2 omitida o falló, conservando foto local:", err);
          }
        })
      );

      mostrarToast("Fotografías preparadas exitosamente", "ok");
    } catch (err: any) {
      mostrarToast(err?.message || "Error al procesar fotografías", "err");
    } finally {
      setSubiendoFoto(false);
      setProgresoSubida(null);
    }
  };

  // Eliminación coordinada de evidencias entre UI, Cloudflare R2 y Neon DB
  const handleEliminarFoto = async (indexAEliminar: number) => {
    const urlAEliminar = fotosIniciales[indexAEliminar];
    setFotosIniciales((prev) => prev.filter((_, idx) => idx !== indexAEliminar));
    const targetMeta = evidenciasMetadata.find((e) => e.url === urlAEliminar);
    if (targetMeta) {
      setEvidenciasMetadata((prev) => prev.filter((e) => e.url !== urlAEliminar));
      try {
        await eliminarEvidenciaSegura({
          evidenceId: targetMeta.evidenceId,
          key: targetMeta.key,
          motivo: "Fotografía descartada por el técnico en recepción",
        });
      } catch (err) {
        console.warn("Aviso al eliminar evidencia física de R2:", err);
      }
    }
  };

  const handleEliminarVideo = async (indexAEliminar: number) => {
    const vidAEliminar = videosIniciales[indexAEliminar];
    setVideosIniciales((prev) => prev.filter((_, idx) => idx !== indexAEliminar));
    const targetMeta = evidenciasMetadata.find((e) => e.url === vidAEliminar?.url);
    if (targetMeta) {
      setEvidenciasMetadata((prev) => prev.filter((e) => e.url !== vidAEliminar.url));
      try {
        await eliminarEvidenciaSegura({
          evidenceId: targetMeta.evidenceId,
          key: targetMeta.key,
          motivo: "Clip de video descartado por el técnico",
        });
      } catch (err) {
        console.warn("Aviso al eliminar video de R2:", err);
      }
    }
  };

  const handleEliminarAudio = async (indexAEliminar: number) => {
    const audioAEliminar = notasVozIniciales[indexAEliminar];
    const targetUrl = (audioAEliminar as any)?.audioUrl || (audioAEliminar as any)?.url;
    setNotasVozIniciales((prev) => prev.filter((_, idx) => idx !== indexAEliminar));
    const targetMeta = evidenciasMetadata.find(
      (e) => e.url === targetUrl || e.evidenceId === (audioAEliminar as any)?.id
    );
    if (targetMeta) {
      setEvidenciasMetadata((prev) =>
        prev.filter((e) => e.url !== targetUrl && e.evidenceId !== (audioAEliminar as any)?.id)
      );
      try {
        await eliminarEvidenciaSegura({
          evidenceId: targetMeta.evidenceId,
          key: targetMeta.key,
          motivo: "Nota de voz descartada por el técnico",
        });
      } catch (err) {
        console.warn("Aviso al eliminar nota de voz de R2:", err);
      }
    }
  };

  // =========================================================================
  // VIDEO DE INGRESO: 720p, MÁX 20s, VISTA PREVIA Y SUBIDA SEGURA
  // =========================================================================
  const iniciarGrabacionVideo = async () => {
    try {
      if (videosIniciales.length >= MULTIMEDIA_CONFIG.MAX_VIDEO_CLIPS) {
        mostrarToast(`Máximo ${MULTIMEDIA_CONFIG.MAX_VIDEO_CLIPS} clips de video permitidos`, "err");
        return;
      }

      detenerTracksMedia();

      // Configuración 720p con framerate moderado
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: MULTIMEDIA_CONFIG.VIDEO_TARGET_WIDTH },
          height: { ideal: MULTIMEDIA_CONFIG.VIDEO_TARGET_HEIGHT },
          frameRate: { ideal: MULTIMEDIA_CONFIG.VIDEO_TARGET_FRAMERATE, max: 30 },
        },
        audio: true,
      });
      videoStreamRef.current = stream;

      const mimeTypes = [
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp9,opus",
        "video/webm",
        "video/mp4",
      ];
      const selectedMime = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "";

      const options: MediaRecorderOptions = {
        videoBitsPerSecond: MULTIMEDIA_CONFIG.VIDEO_BITRATE_BPS,
      };
      if (selectedMime) options.mimeType = selectedMime;

      const recorder = new MediaRecorder(stream, options);
      videoRecorderRef.current = recorder;
      videoChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        setVideoBlobTemp(videoBlob);
        const url = URL.createObjectURL(videoBlob);
        setVideoUrlTemp(url);

        // Liberar cámara inmediatamente para que el usuario previsualice tranquilo
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach((t) => t.stop());
          videoStreamRef.current = null;
        }
      };

      recorder.start();
      setGrabandoVideo(true);
      setSegundosVideo(0);
      setDuracionVideoTemp(0);

      videoTimerRef.current = setInterval(() => {
        setSegundosVideo((prev) => {
          const next = prev + 1;
          setDuracionVideoTemp(next);
          if (next >= MULTIMEDIA_CONFIG.MAX_VIDEO_DURATION_SECONDS) {
            detenerGrabacionVideo();
            return MULTIMEDIA_CONFIG.MAX_VIDEO_DURATION_SECONDS;
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      mostrarToast(
        err?.message ||
        "No se pudo acceder a la cámara. Puedes adjuntar un archivo de video compatible.",
        "err"
      );
    }
  };

  const detenerGrabacionVideo = () => {
    if (videoTimerRef.current) clearInterval(videoTimerRef.current);
    if (videoRecorderRef.current && videoRecorderRef.current.state !== "inactive") {
      videoRecorderRef.current.stop();
    }
    setGrabandoVideo(false);
  };

  const descartarYGrabarDeNuevo = () => {
    if (videoUrlTemp) {
      try {
        URL.revokeObjectURL(videoUrlTemp);
      } catch { }
      setVideoUrlTemp(null);
    }
    setVideoBlobTemp(null);
    setSegundosVideo(0);
    setDuracionVideoTemp(0);
    iniciarGrabacionVideo();
  };

  const cancelarVideoTemp = () => {
    if (videoUrlTemp) {
      try {
        URL.revokeObjectURL(videoUrlTemp);
      } catch { }
      setVideoUrlTemp(null);
    }
    setVideoBlobTemp(null);
    detenerTracksMedia();
    setPanelMultimedia(null);
  };

  const guardarVideoConfirmado = async () => {
    if (!videoBlobTemp) return;
    try {
      setSubiendoVideo(true);
      const duracion = duracionVideoTemp || segundosVideo || 1;
      const res = await subirEvidenciaSegura({
        archivo: videoBlobTemp,
        tipo: "video",
        carpeta: "taller_video",
        nombreArchivo: `clip_${Date.now()}.webm`,
        durationSeconds: duracion,
        plate: vehiculoPlaca.trim().toUpperCase() || undefined,
        uploadedBy: ingresadoPor.trim() || empleadoLogueado.nombre,
        branch: getClientActiveBranch("/taller") === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL",
        onProgress: (p) => setProgresoSubida(p),
      });

      setVideosIniciales((prev) => [
        ...prev,
        { url: res.url, duracion, nombre: `Clip (${duracion}s)` },
      ]);
      setEvidenciasMetadata((prev) => [
        ...prev,
        {
          url: res.url,
          key: res.key,
          evidenceId: res.evidenceId,
          tipo: "video",
          fileSizeBytes: res.fileSizeBytes,
          mimeType: res.mimeType,
          durationSeconds: duracion,
          clientTempId: res.clientTempId,
        },
      ]);
      mostrarToast("Clip de video guardado y respaldado en Cloudflare R2", "ok");

      if (videoUrlTemp) {
        try {
          URL.revokeObjectURL(videoUrlTemp);
        } catch { }
        setVideoUrlTemp(null);
      }
      setVideoBlobTemp(null);
      setPanelMultimedia(null);
    } catch (err: any) {
      mostrarToast(err?.message || "Error al subir video a Cloudflare R2", "err");
    } finally {
      setSubiendoVideo(false);
      setProgresoSubida(null);
    }
  };

  const handleSubirArchivoVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputVideoRef.current) fileInputVideoRef.current.value = "";
    if (videosIniciales.length >= MULTIMEDIA_CONFIG.MAX_VIDEO_CLIPS) {
      mostrarToast(`Máximo ${MULTIMEDIA_CONFIG.MAX_VIDEO_CLIPS} videos permitidos`, "err");
      return;
    }
    try {
      setSubiendoVideo(true);
      const res = await subirEvidenciaSegura({
        archivo: file,
        tipo: "video",
        carpeta: "taller_video",
        nombreArchivo: file.name,
        plate: vehiculoPlaca.trim().toUpperCase() || undefined,
        uploadedBy: ingresadoPor.trim() || empleadoLogueado.nombre,
        branch: getClientActiveBranch("/taller") === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL",
        onProgress: (p) => setProgresoSubida(p),
      });

      setVideosIniciales((prev) => [...prev, { url: res.url, nombre: file.name }]);
      setEvidenciasMetadata((prev) => [
        ...prev,
        {
          url: res.url,
          key: res.key,
          evidenceId: res.evidenceId,
          tipo: "video",
          fileSizeBytes: res.fileSizeBytes,
          mimeType: res.mimeType,
          clientTempId: res.clientTempId,
        },
      ]);
      mostrarToast("Video cargado y respaldado en Cloudflare R2", "ok");
      setPanelMultimedia(null);
    } catch (err: any) {
      mostrarToast(err?.message || "Error al subir video", "err");
    } finally {
      setSubiendoVideo(false);
      setProgresoSubida(null);
    }
  };

  // =========================================================================
  // NOTA DE VOZ: GRABACIÓN NATIVA, RECONOCIMIENTO DESACOPLADO Y SUBIDA SEGURA R2
  // =========================================================================
  const iniciarGrabacionAudio = async () => {
    try {
      setAudioPermisoError(null);
      setErrorSubidaAudio(null);
      detenerTracksMedia();

      // Solicitar acceso al micrófono con cancelación de eco y ruido
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      audioStreamRef.current = stream;

      const selectedMime = getBestSupportedAudioMimeType();
      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 64000,
      };
      if (selectedMime) options.mimeType = selectedMime;

      const recorder = new MediaRecorder(stream, options);
      audioRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || selectedMime || "audio/webm",
        });
        setAudioBlobTemp(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrlTemp(url);

        // Liberar el micrófono inmediatamente para optimizar recursos
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }
      };

      recorder.start();
      setGrabandoAudio(true);
      grabandoAudioRef.current = true;
      setSegundosAudio(0);
      setTranscripcionVoz("");
      transcripcionVozRef.current = "";
      transcripcionUltimaAgregadaRef.current = "";
      setTranscripcionOriginal("");
      setEstadoTranscripcion("pendiente");

      // Temporizador de 60 segundos por nota de voz (límite configurable)
      audioTimerRef.current = setInterval(() => {
        setSegundosAudio((prev) => {
          const next = prev + 1;
          if (next >= MULTIMEDIA_CONFIG.MAX_AUDIO_DURATION_SECONDS) {
            detenerGrabacionAudio();
            return MULTIMEDIA_CONFIG.MAX_AUDIO_DURATION_SECONDS;
          }
          return next;
        });
      }, 1000);

      // Web Speech API como proveedor de dictado desacoplado y seguro
      const speechProvider = new BrowserSpeechRecognitionProvider();
      if (speechProvider.isSupported()) {
        const liveRec = speechProvider.startLiveRecognition(
          (text, isFinal) => {
            const limpio = text.trim();
            if (limpio) {
              transcripcionVozRef.current = limpio;
              setTranscripcionVoz(limpio);
              setTranscripcionOriginal(limpio);
              setEstadoTranscripcion(isFinal ? "lista" : "pendiente");

              // Si la grabación ya se detuvo pero el proveedor entrega resultados finales tardíos
              if (!grabandoAudioRef.current) {
                const yaAgregado = transcripcionUltimaAgregadaRef.current;
                if (yaAgregado && yaAgregado !== limpio) {
                  transcripcionUltimaAgregadaRef.current = limpio;
                  setMotivoIngreso((prev) => {
                    if (prev.endsWith(yaAgregado)) {
                      return prev.slice(0, prev.length - yaAgregado.length) + limpio;
                    }
                    const base = prev.trim();
                    return base ? `${base}\n${limpio}` : limpio;
                  });
                } else if (!yaAgregado) {
                  transcripcionUltimaAgregadaRef.current = limpio;
                  setMotivoIngreso((prev) => {
                    const base = prev.trim();
                    if (!base) return limpio;
                    if (base.endsWith(limpio)) return base;
                    return `${base}\n${limpio}`;
                  });
                }
              }
            }
          },
          (err) => {
            console.warn("Aviso en reconocimiento de voz:", err);
            setEstadoTranscripcion((prev) => (prev === "lista" ? "lista" : "error"));
          }
        );
        speechRecognitionRef.current = liveRec;
      } else {
        setEstadoTranscripcion("no_disponible");
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setAudioPermisoError(
          "Permiso de micrófono no concedido. Habilita el acceso al micrófono en los permisos de tu navegador para registrar notas de voz."
        );
        mostrarToast("Permiso de micrófono denegado", "err");
      } else {
        setAudioPermisoError(
          "No se pudo acceder al micrófono: " + (err?.message || "Dispositivo no disponible")
        );
        mostrarToast(err?.message || "Error al acceder al micrófono", "err");
      }
      setGrabandoAudio(false);
      grabandoAudioRef.current = false;
    }
  };

  const detenerGrabacionAudio = () => {
    if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive") {
      audioRecorderRef.current.stop();
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch { }
      speechRecognitionRef.current = null;
    }
    setGrabandoAudio(false);
    grabandoAudioRef.current = false;

    // Pasar el texto transcrito de forma automática al campo motivo de ingreso
    const textoDetectado = (transcripcionVozRef.current || transcripcionVoz).trim();
    if (textoDetectado) {
      transcripcionUltimaAgregadaRef.current = textoDetectado;
      setMotivoIngreso((prev) => {
        const base = prev.trim();
        if (!base) return textoDetectado;
        if (base.endsWith(textoDetectado)) return base;
        return `${base}\n${textoDetectado}`;
      });
      mostrarToast("Texto transcrito añadido a Motivo de Ingreso", "ok");
    }

    setEstadoTranscripcion((prev) => {
      if (prev === "pendiente") {
        return textoDetectado ? "lista" : "no_disponible";
      }
      return prev;
    });
  };

  const descartarYGrabarVoz = () => {
    if (audioUrlTemp) {
      try {
        URL.revokeObjectURL(audioUrlTemp);
      } catch { }
      setAudioUrlTemp(null);
    }
    setAudioBlobTemp(null);
    setTranscripcionVoz("");
    setTranscripcionOriginal("");
    setSegundosAudio(0);
    setErrorSubidaAudio(null);
    iniciarGrabacionAudio();
  };

  const guardarNotaVoz = async () => {
    if (!audioBlobTemp) return;
    try {
      setSubiendoAudio(true);
      setErrorSubidaAudio(null);

      const mime = audioBlobTemp.type || "audio/webm";
      const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";
      const fileName = `voice_${Date.now()}.${ext}`;

      // Subida segura al bucket de Cloudflare R2
      const res = await subirEvidenciaSegura({
        archivo: audioBlobTemp,
        tipo: "audio",
        carpeta: "taller_audio",
        nombreArchivo: fileName,
        plate: vehiculoPlaca.trim().toUpperCase() || undefined,
        uploadedBy: ingresadoPor.trim() || empleadoLogueado.nombre,
        branch: getClientActiveBranch("/taller") === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL",
        onProgress: (p) => setProgresoSubida(p),
      });

      const duracion = segundosAudio || 1;
      const textoFinal = transcripcionVoz.trim();

      // Determinar estado de la transcripción
      let estadoFinal: TranscriptionStatus = estadoTranscripcion;
      if (textoFinal && transcripcionOriginal && textoFinal !== transcripcionOriginal) {
        estadoFinal = "corregida";
      } else if (textoFinal && estadoTranscripcion === "no_disponible") {
        estadoFinal = "manual";
      } else if (!textoFinal) {
        estadoFinal = "no_disponible";
      }

      // Registro estructurado vinculado a orden y vehículo
      const nuevaNota: VoiceNoteRecord = {
        id: "vn_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        plate: vehiculoPlaca.trim().toUpperCase() || undefined,
        audioUrl: res.url,
        storageKey: res.key,
        durationSeconds: duracion,
        mimeType: mime,
        fileSize: audioBlobTemp.size,
        text: textoFinal,
        transcriptionStatus: estadoFinal,
        provider: estadoFinal === "manual" ? "manual" : "browser-speech-api",
        author: ingresadoPor || empleadoLogueado.nombre,
        authorId: empleadoLogueado.id,
        createdAt: new Date().toISOString(),
      };

      setNotasVozIniciales((prev) => [...prev, nuevaNota]);

      // Asegurar que el texto final quede reflejado limpiamente sin duplicar
      if (textoFinal) {
        setMotivoIngreso((prev) => {
          const base = prev.trim();
          if (!base) return textoFinal;
          if (base.includes(textoFinal)) return base;
          return `${base}\n${textoFinal}`;
        });
      }
      transcripcionUltimaAgregadaRef.current = "";
      transcripcionVozRef.current = "";

      mostrarToast("Nota de voz y transcripción guardadas correctamente", "ok");

      // Liberar objeto URL de memoria
      if (audioUrlTemp) {
        try {
          URL.revokeObjectURL(audioUrlTemp);
        } catch { }
        setAudioUrlTemp(null);
      }
      setAudioBlobTemp(null);
      setTranscripcionVoz("");
      setTranscripcionOriginal("");
      setErrorSubidaAudio(null);
      setPanelMultimedia(null);
    } catch (err: any) {
      setErrorSubidaAudio(
        err?.message || "Error al subir el archivo a Cloudflare R2. Puedes reintentar."
      );
      mostrarToast(
        err?.message || "Fallo en la subida a Cloudflare R2. Pulsa Reintentar.",
        "err"
      );
    } finally {
      setSubiendoAudio(false);
      setProgresoSubida(null);
    }
  };

  const descartarNotaVozTemp = () => {
    detenerTracksMedia();
    grabandoAudioRef.current = false;
    transcripcionUltimaAgregadaRef.current = "";
    transcripcionVozRef.current = "";
    setAudioBlobTemp(null);
    if (audioUrlTemp) {
      try {
        URL.revokeObjectURL(audioUrlTemp);
      } catch { }
      setAudioUrlTemp(null);
    }
    setTranscripcionVoz("");
    setTranscripcionOriginal("");
    setSegundosAudio(0);
    setErrorSubidaAudio(null);
    setAudioPermisoError(null);
    setPanelMultimedia(null);
  };

  const [ingresadoPor, setIngresadoPor] = useState(empleadoLogueado.nombre || "");
  const [asignacionesTecnicos, setAsignacionesTecnicos] = useState<
    { id: string; nombre: string; tarea: string }[]
  >([]);
  const [empleadosDb, setEmpleadosDb] = useState<
    { id: string; name: string; role?: string; department?: string }[]
  >([]);

  useEffect(() => {
    let cancel = false;
    fetch("/api/gerencia/personal")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancel && Array.isArray(data)) {
          const activos = data.filter((e) => e.status !== "Inactivo");
          setEmpleadosDb(activos);
        }
      })
      .catch(() => { });
    return () => {
      cancel = true;
    };
  }, []);
  const [mostrarFlotanteAsignar, setMostrarFlotanteAsignar] = useState(false);
  const [flotanteTecnicoSeleccionado, setFlotanteTecnicoSeleccionado] = useState("");
  const [busquedaTecnico, setBusquedaTecnico] = useState("");
  const [flotanteTarea, setFlotanteTarea] = useState("");
  const [emailContacto, setEmailContacto] = useState("");
  const [motivoIngreso, setMotivoIngreso] = useState("");
  const [creando, setCreando] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownTecnicoRef = useRef<HTMLDivElement | null>(null);
  const [mostrarDropdownTecnicos, setMostrarDropdownTecnicos] = useState(false);

  // =========================================================================
  // ESCÁNER DE MATRÍCULA (APPLE iOS / ANDROID / CÁMARA WEB + OCR + NEON DB)
  // =========================================================================
  const [mostrarEscanerMatricula, setMostrarEscanerMatricula] = useState(false);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [procesandoOcr, setProcesandoOcr] = useState(false);
  const [estadoEscaneo, setEstadoEscaneo] = useState<string>("");
  const [placaDetectadaInput, setPlacaDetectadaInput] = useState<string>("");
  const [previewImagenUrl, setPreviewImagenUrl] = useState<string | null>(null);
  const [matriculaEscaneadaInfo, setMatriculaEscaneadaInfo] = useState<{
    placa: string;
    existe: boolean;
    clienteNombre?: string;
    vehiculoTexto?: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputFotoNativaRef = useRef<HTMLInputElement | null>(null);

  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamaraActiva(false);
  };

  useEffect(() => {
    if (!isOpen || !mostrarEscanerMatricula) {
      detenerCamara();
    }
    return () => {
      detenerCamara();
    };
  }, [isOpen, mostrarEscanerMatricula]);

  const iniciarCamaraEnVivo = async () => {
    setErrorCamara(null);
    setPreviewImagenUrl(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorCamara("Usa el botón 'Cámara del Celular' para tomar la foto de la matrícula.");
      return;
    }
    try {
      detenerCamara();
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = mediaStream;
      setCamaraActiva(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.setAttribute("webkit-playsinline", "true");
          videoRef.current.play().catch(() => { });
        }
      }, 60);
    } catch {
      setCamaraActiva(false);
      setErrorCamara("Permiso de cámara no disponible. Pulsa 'Cámara Celular' para tomar la foto.");
    }
  };

  const abrirEscanerMatricula = () => {
    setPlacaDetectadaInput("");
    setEstadoEscaneo("");
    setPreviewImagenUrl(null);
    setErrorCamara(null);
    setMostrarEscanerMatricula(true);
    iniciarCamaraEnVivo();
  };

  // Normaliza y formatea una cadena de placa (ej. ABC1234 -> ABC-1234)
  const formatearPlacaDetectada = (raw: string): string => {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "").replace(/^-+|-+$/g, "");
    const alnum = clean.replace(/[^A-Z0-9]/g, "");
    const matchLetrasNum = alnum.match(/^([A-Z]{2,4})(\d{2,4}[A-Z]?)$/);
    if (matchLetrasNum) {
      return `${matchLetrasNum[1]}-${matchLetrasNum[2]}`;
    }
    return clean || alnum;
  };

  // Extrae el texto de la matrícula comparando con catálogo y patrones de placas
  const extraerPlacaDeTextoOcr = (textoCrudo: string): string => {
    const upper = (textoCrudo || "").toUpperCase();
    const lineas = upper
      .split(/[\r\n]+/)
      .map((l) => l.replace(/[^A-Z0-9\s-]/g, " ").trim())
      .filter(Boolean);

    const textoSinSimbolos = upper.replace(/[^A-Z0-9]/g, "");

    // 1. Verificar si alguna placa ya registrada en listaClientes aparece en la lectura OCR
    for (const c of listaClientes || []) {
      for (const v of c.vehicles || []) {
        const pOriginal = String(v.plate || "").trim().toUpperCase();
        const pAlnum = pOriginal.replace(/[^A-Z0-9]/g, "");
        if (pAlnum.length >= 5 && textoSinSimbolos.includes(pAlnum)) {
          return pOriginal;
        }
      }
    }

    // 2. Buscar patrones estándar de matrículas (AAA-1234, AAA-123, AA-1234, AAAA-12, A1B-234)
    const patrones = [
      /\b([A-Z]{3})[\s-]*(\d{3,4}[A-Z]?)\b/,
      /\b([A-Z]{2})[\s-]*(\d{4})\b/,
      /\b([A-Z]{4})[\s-]*(\d{2,3})\b/,
      /\b([A-Z]\d[A-Z])[\s-]*(\d{3})\b/,
      /\b(\d{3,4})[\s-]*([A-Z]{2,3})\b/,
    ];

    for (const linea of [upper, ...lineas]) {
      for (const regex of patrones) {
        const m = linea.match(regex);
        if (m && m[1] && m[2]) {
          return `${m[1]}-${m[2]}`;
        }
      }
    }

    // 3. Buscar secuencias pegadas en bloques alfanuméricos de 5 a 8 caracteres con letras y números
    const tokens = upper.replace(/[^A-Z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
    for (const tk of tokens) {
      const alnum = tk.replace(/[^A-Z0-9]/g, "");
      if (alnum.length >= 5 && alnum.length <= 8 && /[A-Z]{2,}/.test(alnum) && /\d{2,}/.test(alnum)) {
        return formatearPlacaDetectada(alnum);
      }
    }

    return "";
  };

  // Verifica en Neon PostgreSQL y en el catálogo si la matrícula existe o si debe abrir formulario nuevo
  const verificarYAplicarMatricula = async (placaRaw: string) => {
    const placaLimpia = formatearPlacaDetectada(placaRaw);
    const alnumBuscado = placaLimpia.replace(/[^A-Z0-9]/g, "");
    if (!alnumBuscado || alnumBuscado.length < 3) {
      mostrarToast("Ingresa o escanea una matrícula válida", "err");
      return;
    }

    try {
      setProcesandoOcr(true);
      setEstadoEscaneo(`Verificando matrícula ${placaLimpia} en base de datos...`);

      // 1. Buscar primero en el catálogo local cargado
      let clienteHallado: any = null;
      let vehiculoHallado: any = null;

      for (const c of listaClientes || []) {
        const vMatch = (c.vehicles || []).find(
          (v: any) => String(v.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === alnumBuscado
        );
        if (vMatch) {
          clienteHallado = c;
          vehiculoHallado = vMatch;
          break;
        }
      }

      // 2. Consultar en tiempo real a Neon PostgreSQL (/api/taller/operacion?query=...)
      if (!clienteHallado || !vehiculoHallado) {
        const res = await fetch(`/api/taller/operacion?query=${encodeURIComponent(placaLimpia)}`);
        const data = await res.json().catch(() => null);
        if (data?.success && data?.found && data?.customer) {
          // Verificar que realmente coincida por vehículo/placa
          const vehiculosCliente = Array.isArray(data.customer.vehicles)
            ? data.customer.vehicles
            : data.vehicle
              ? [data.vehicle]
              : [];
          const vExacto =
            vehiculosCliente.find(
              (v: any) => String(v.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === alnumBuscado
            ) || data.vehicle;

          if (vExacto) {
            clienteHallado = {
              ...data.customer,
              vehicles: vehiculosCliente.length > 0 ? vehiculosCliente : [vExacto],
            };
            vehiculoHallado = vExacto;

            // Actualizar catálogo local para futuras búsquedas
            setListaClientes((prev) => {
              const existe = prev.some((item) => item.id === clienteHallado.id);
              return existe ? prev : [clienteHallado, ...prev];
            });
          }
        }
      }

      detenerCamara();
      setMostrarEscanerMatricula(false);

      // CASO A: LA MATRÍCULA YA EXISTE EN NEON -> Cargar cliente + vehículo y avanzar
      if (clienteHallado && vehiculoHallado) {
        const placaReal = (vehiculoHallado.plate || placaLimpia).toUpperCase();
        setClienteSeleccionado(clienteHallado);
        setBusquedaCliente(clienteHallado.name || "");
        setEmailContacto(clienteHallado.email || "");
        setMostrarDropdownClientes(false);
        setMostrarFormNuevoCliente(false);

        setVehiculoSeleccionadoId(vehiculoHallado.id || "0");
        setVehiculoPlaca(placaReal);
        setVehiculoMarca(vehiculoHallado.brand || "");
        setVehiculoModelo(vehiculoHallado.model || "");
        setVehiculoKm(vehiculoHallado.mileage ? String(vehiculoHallado.mileage) : "");
        setMostrarFormNuevoVehiculo(false);

        setMatriculaEscaneadaInfo({
          placa: placaReal,
          existe: true,
          clienteNombre: clienteHallado.name,
          vehiculoTexto: [vehiculoHallado.brand, vehiculoHallado.model].filter(Boolean).join(" ") || "Vehículo registrado",
        });

        mostrarToast(
          `Matrícula ${placaReal} detectada: ${clienteHallado.name} (${[vehiculoHallado.brand, vehiculoHallado.model].filter(Boolean).join(" ") || "Registrado"})`,
          "ok"
        );
        setPasoActivo(3);
        return;
      }

      // CASO B: LA MATRÍCULA NO EXISTE -> Pre-llenar placa y abrir formularios de cliente y vehículo
      setVehiculoSeleccionadoId("NUEVO");
      setVehiculoPlaca(placaLimpia);
      setVehiculoMarca("");
      setVehiculoModelo("");
      setVehiculoKm("");
      setMostrarFormNuevoVehiculo(true);
      setSubPasoVehiculo("marca");

      setMatriculaEscaneadaInfo({
        placa: placaLimpia,
        existe: false,
      });

      if (clienteSeleccionado) {
        // Si ya había elegido un cliente antes de escanear, ir directo al paso 2 con la placa lista
        setPasoActivo(2);
        mostrarToast(
          `Matrícula ${placaLimpia} no registrada. Completa los datos del nuevo vehículo.`,
          "ok"
        );
      } else {
        // Abrir formulario de Nuevo Cliente en Paso 1 y dejar placa lista para Paso 2
        setMostrarDropdownClientes(false);
        setMostrarFormNuevoCliente(true);
        setSubPasoCliente("tipo");
        setPasoActivo(1);
        mostrarToast(
          `Matrícula ${placaLimpia} nueva. Llena los datos del cliente y del vehículo.`,
          "ok"
        );
      }
    } catch {
      mostrarToast("Error al verificar la matrícula en la base de datos", "err");
    } finally {
      setProcesandoOcr(false);
      setEstadoEscaneo("");
    }
  };

  // Procesa un Canvas con mejora de contraste y ejecuta Tesseract OCR
  const procesarCanvasConOcr = async (canvasSource: HTMLCanvasElement) => {
    try {
      setProcesandoOcr(true);
      setEstadoEscaneo("Leyendo caracteres de la matrícula...");

      // Crear versión mejorada en alto contraste para optimizar lectura en placas metálicas/reflectivas
      const workCanvas = document.createElement("canvas");
      workCanvas.width = canvasSource.width;
      workCanvas.height = canvasSource.height;
      const ctx = workCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(canvasSource, 0, 0);
        const imgData = ctx.getImageData(0, 0, workCanvas.width, workCanvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          // Aumentar contraste alrededor del punto medio
          const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.65 + 128));
          d[i] = contrasted;
          d[i + 1] = contrasted;
          d[i + 2] = contrasted;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const { recognize } = await import("tesseract.js");
      const result = await recognize(workCanvas, "eng");
      const textoLeido = result?.data?.text || "";
      const placaExtraida = extraerPlacaDeTextoOcr(textoLeido);

      if (placaExtraida) {
        setPlacaDetectadaInput(placaExtraida);
        await verificarYAplicarMatricula(placaExtraida);
      } else {
        setEstadoEscaneo(
          "No se distinguió nítidamente la matrícula. Intenta acercar más la cámara o escríbela abajo."
        );
      }
    } catch {
      setEstadoEscaneo("No se pudo procesar la imagen automáticamente. Ingresa o confirma la placa abajo.");
    } finally {
      setProcesandoOcr(false);
    }
  };

  // Capturar fotograma desde la cámara en vivo (iOS Safari / Android Chrome)
  const capturarDesdeVideoEnVivo = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      inputFotoNativaRef.current?.click();
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Recortar la franja central donde se ubica el recuadro guía de matrícula
    const cropW = Math.round(vw * 0.84);
    const cropH = Math.round(vh * 0.45);
    const cropX = Math.round((vw - cropW) / 2);
    const cropY = Math.round((vh - cropH) / 2);

    const canvas = document.createElement("canvas");
    const targetWidth = Math.min(1000, cropW);
    const scale = targetWidth / cropW;
    canvas.width = targetWidth;
    canvas.height = Math.round(cropH * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

    setPreviewImagenUrl(canvas.toDataURL("image/jpeg", 0.9));
    await procesarCanvasConOcr(canvas);
  };

  // Procesar foto tomada desde cámara nativa de iPhone / Android (<input capture="environment">)
  const handleFotoNativaCapturada = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      setPreviewImagenUrl(dataUrl);

      const img = new Image();
      img.onload = async () => {
        const maxDim = 1100;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        await procesarCanvasConOcr(canvas);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const [etiquetaRolCabecera, setEtiquetaRolCabecera] = useState<"Mecánico" | "Asesor">("Mecánico");
  const [correlativoOrden, setCorrelativoOrden] = useState<string>("00001");
  const [fechaHoraRecepcion, setFechaHoraRecepcion] = useState<string>("");

  // Reloj automático en tiempo real para la etiqueta de Hora de Recepción (Formato: Martes 25 Dic, 2026 • 20:38)
  useEffect(() => {
    if (!isOpen) return;
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const mesesCortos = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const actualizarReloj = () => {
      const ahora = new Date();
      const diaTexto = diasSemana[ahora.getDay()];
      const diaNum = ahora.getDate();
      const mesTexto = mesesCortos[ahora.getMonth()];
      const anio = ahora.getFullYear();
      const hora = ahora.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setFechaHoraRecepcion(`${diaTexto} ${diaNum} ${mesTexto}, ${anio} • ${hora}`);
    };
    actualizarReloj();
    const timer = setInterval(actualizarReloj, 15000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Sincronizar el usuario logueado, su etiqueta de rol (Asesor o Mecánico) y el código correlativo de OT
  useEffect(() => {
    if (isOpen && !editOrderId) {
      fetch("/api/taller/operacion?nextCorrelative=true")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.success && d?.correlative) {
            setCorrelativoOrden(String(d.correlative));
          }
        })
        .catch(() => { });
    }
    if (empleadoLogueado?.nombre) {
      setIngresadoPor(empleadoLogueado.nombre);
      setAsignacionesTecnicos((prev) => {
        if (prev.length === 0) {
          return [
            {
              id: "asig-1",
              nombre: empleadoLogueado.nombre,
              tarea: "",
            },
          ];
        }
        return prev;
      });
    }
    const rolLower = (empleadoLogueado?.rol || "").toLowerCase();
    if (
      rolLower.includes("asesor") ||
      rolLower.includes("recep") ||
      rolLower.includes("oficina") ||
      rolLower.includes("admin")
    ) {
      setEtiquetaRolCabecera("Asesor");
    } else if (empleadoLogueado?.rol) {
      setEtiquetaRolCabecera("Mecánico");
    } else if (typeof window !== "undefined") {
      try {
        const up = JSON.parse(localStorage.getItem("user_profile") || "null");
        const upRole = String(up?.role || up?.rol || "").toLowerCase();
        if (
          upRole.includes("asesor") ||
          upRole.includes("recep") ||
          upRole.includes("oficina") ||
          upRole.includes("admin")
        ) {
          setEtiquetaRolCabecera("Asesor");
        }
      } catch { }
    }
  }, [empleadoLogueado, isOpen]);

  // Cargar datos completos de la orden cuando se abre en modo edición (editOrderId)
  useEffect(() => {
    if (!editOrderId) return;
    let active = true;

    const aplicarDatosOrden = (ord: any, cust?: any, veh?: any) => {
      if (!ord) return;
      const cleanCorr = String(ord.orderNumber || "")
        .replace(/^OT\s*#?/i, "")
        .replace(/^#/, "")
        .trim();
      if (cleanCorr) setCorrelativoOrden(cleanCorr);

      const rawName = cust?.name || ord.client || "";
      const esClienteFalso = !rawName || rawName.toLowerCase().includes("consumidor final") || rawName.toLowerCase().includes("cliente mostrador");
      const cName = esClienteFalso ? "" : rawName;
      const cIdent = esClienteFalso ? "" : cust?.identification || ord.clientIdDoc || "";
      const cPhone = esClienteFalso ? "" : cust?.phone || ord.clientPhone || "";
      const cEmail = esClienteFalso ? "" : cust?.email || ord.clientEmail || "";
      const cAddr = esClienteFalso ? "" : cust?.address || ord.clientAddress || "";
      const cType = cust?.type === "Empresa" ? "Empresa" : "Persona";

      setTipoCliente(cType);
      setBusquedaCliente(cName);
      setNuevoClienteNombre(cName);
      setNuevoClienteIdentificacion(cIdent);
      setNuevoClienteTelefono(cPhone);
      setNuevoClienteEmail(cEmail);
      setNuevoClienteDireccion(cAddr);
      setEmailContacto(cEmail);
      setNuevoClienteFoto(cust?.avatar || cust?.imageUrl || ord?.customer?.avatar || ord?.customer?.imageUrl || null);

      if (cust && !esClienteFalso) {
        setClienteSeleccionado(cust);
      } else if (cName) {
        setClienteSeleccionado({
          id: ord.customerId || undefined,
          name: cName,
          identification: cIdent,
          phone: cPhone,
          email: cEmail,
          address: cAddr,
          type: cType === "Empresa" ? "Empresa" : "Personal",
          vehicles: veh ? [veh] : [],
        });
      } else {
        setClienteSeleccionado(null);
      }

      const anioMatch = String(ord.vehicle || "").match(/\b(?:19|20)\d{2}\b/)?.[0];
      const anioInicial = String(veh?.year || anioMatch || new Date().getFullYear());
      const tituloSinAnio = String(ord.vehicle || "")
        .replace(new RegExp(`\\b${anioInicial}\\b`), "")
        .trim();
      const partesVeh = tituloSinAnio.split(/\s+/).filter(Boolean);
      const rawMarca = veh?.brand || partesVeh[0] || "";
      const rawModelo = veh?.model || partesVeh.slice(1).join(" ") || "";
      const rawPlaca = veh?.plate || ord.plate || "";

      const esVehiculoFalso =
        rawPlaca.toUpperCase() === "EXPRESS" ||
        rawMarca.toLowerCase().includes("atención rápida") ||
        rawMarca.toLowerCase().includes("atencion rapida");

      const marcaInicial = esVehiculoFalso ? "" : rawMarca;
      const modeloInicial = esVehiculoFalso ? "" : rawModelo;
      const placaInicialOrd = esVehiculoFalso ? "" : rawPlaca;
      const tipoInicial = veh?.vehicleType || detectarCarroceria(modeloInicial, marcaInicial) || "Auto";

      setVehiculoSeleccionadoId(esVehiculoFalso ? "NUEVO" : (veh?.id || ord.vehicleId || "NUEVO"));
      setVehiculoPlaca(placaInicialOrd);
      setVehiculoMarca(marcaInicial);
      setVehiculoModelo(modeloInicial);
      setVehiculoAnio(anioInicial);
      setVehiculoTipo(tipoInicial);
      setVehiculoKm(
        ord.mileage ? String(ord.mileage) : veh?.mileage ? String(veh.mileage) : ""
      );
      setVehiculoFoto(veh?.imageUrl || ord?.vehicle?.imageUrl || null);
      setMostrarFormNuevoVehiculo(true);

      if (ord.fuelLevel) {
        handleBotonCombustible(ord.fuelLevel as any);
      }
      if (Array.isArray(ord.receptionInventory)) {
        const invLimpio = ord.receptionInventory
          .map((x: any) => String(x || "").trim())
          .filter(Boolean);
        setInventarioTrae(invLimpio);
        setListaItemsInventario((prev) => {
          const existentes = new Set(prev.map((i) => i.toLowerCase()));
          const nuevos = invLimpio.filter((i: string) => !existentes.has(i.toLowerCase()));
          return nuevos.length > 0 ? [...prev, ...nuevos] : prev;
        });
      }
      const voiceUrls = new Set(
        (Array.isArray(ord.voiceNotes) ? ord.voiceNotes : [])
          .map((a: any) => a?.audioUrl || a?.url)
          .filter(Boolean)
      );
      if (Array.isArray(ord.receptionPhotos)) {
        const esVideoUrl = (u: string) => /\.(mp4|mov|avi|mkv)(?:$|\?)/i.test(u) || (u.endsWith(".webm") && !voiceUrls.has(u));
        const esAudioUrl = (u: string) => voiceUrls.has(u) || /\.(ogg|m4a|wav|mp3|aac)(?:$|\?)/i.test(u);
        setFotosIniciales(
          ord.receptionPhotos.filter(
            (u: string) => typeof u === "string" && !esVideoUrl(u) && !esAudioUrl(u)
          )
        );
        const videosExistentes = ord.receptionPhotos
          .filter((u: string) => typeof u === "string" && esVideoUrl(u))
          .map((u: string, idx: number) => ({ url: u, duracion: 0, nombre: `Video ${idx + 1}` }));
        setVideosIniciales(videosExistentes);
      }
      setNotasVozIniciales(Array.isArray(ord.voiceNotes) ? ord.voiceNotes : []);

      const rawNotes = String(ord.notes || "");
      const partesNotes = rawNotes.split(" | Ingresado por:");
      const sinIngresado = partesNotes[0].trim();
      const ingresadoExtraido = partesNotes[1]?.trim();
      if (ingresadoExtraido) {
        setIngresadoPor(ingresadoExtraido);
      }
      if (/^\[Lubricentro\]/i.test(sinIngresado)) {
        setTipoIngreso("Lubricentro");
      } else if (/^\[Lavado\]/i.test(sinIngresado)) {
        setTipoIngreso("Lavado");
      } else {
        setTipoIngreso("Taller");
      }
      const limpioMotivo = sinIngresado.replace(/^\[(?:Lubricentro|Lavado)\]\s*/i, "").trim();
      setMotivoIngreso(
        limpioMotivo === "Ingreso a taller para revisión / servicio." ||
          limpioMotivo === "Ingreso a taller"
          ? ""
          : limpioMotivo
      );

      if (Array.isArray(ord.assignedTechnicians) && ord.assignedTechnicians.length > 0) {
        const listaAsig = ord.assignedTechnicians
          .map((t: any, idx: number) => ({
            id: `asig-${idx + 1}`,
            nombre: String(t?.name || t?.nombre || "").trim(),
            tarea: String(t?.tarea || t?.labor || "").trim(),
          }))
          .filter((t: any) => t.nombre && t.nombre.toLowerCase() !== "sin asignar");
        setAsignacionesTecnicos(listaAsig);
      } else if (ord.mechanic) {
        const listaMec = String(ord.mechanic)
          .split(",")
          .map((seg: string, idx: number) => {
            const nombreMec = seg.split("(")[0].trim();
            const tareaMec = seg.includes("(")
              ? seg.split("(")[1]?.replace(/\)/g, "").trim() || ""
              : "";
            return { id: `asig-${idx + 1}`, nombre: nombreMec, tarea: tareaMec };
          })
          .filter((t) => t.nombre && t.nombre.toLowerCase() !== "sin asignar");
        setAsignacionesTecnicos(listaMec);
      } else {
        setAsignacionesTecnicos([]);
      }
    };

    // Hidratación instantánea (0ms) desde caché de sesión si viene del botón Editar de Taller
    if (typeof window !== "undefined") {
      try {
        const cachedRaw = sessionStorage.getItem("taller_orden_editar_cache");
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (
            cached?.order &&
            (cached.editId === editOrderId ||
              cached.order.id === editOrderId ||
              cached.order.orderNumber === editOrderId)
          ) {
            aplicarDatosOrden(cached.order, cached.customer, cached.vehicle);
          }
        }
      } catch { }
    }

    fetch(`/api/taller/operacion?quoteToken=${encodeURIComponent(editOrderId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d?.success || !d?.order) return;
        aplicarDatosOrden(d.order, d.customer, d.vehicle);
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, [editOrderId]);


  // Lista única consolidada de todos los técnicos conocidos
  const listaMecanicosUnica = useMemo(() => {
    const asignadosNombres = asignacionesTecnicos.map((a) => a.nombre);
    const dbNombres = empleadosDb.map((e) => e.name).filter(Boolean);
    const propsNombres = (mecanicos || []).filter((m) => m && m !== "Carlos Rodríguez");
    const adminNombre =
      empleadoLogueado?.nombre && empleadoLogueado.nombre !== "Carlos Rodríguez"
        ? [empleadoLogueado.nombre]
        : [];
    return Array.from(
      new Set(
        [...dbNombres, ...propsNombres, ...adminNombre, ...asignadosNombres].filter(
          (m): m is string => Boolean(m && String(m).trim().length > 0 && m !== "Carlos Rodríguez")
        )
      )
    );
  }, [empleadosDb, empleadoLogueado?.nombre, mecanicos, asignacionesTecnicos]);

  // Técnicos filtrados por término de búsqueda
  const mecanicosFiltrados = useMemo(() => {
    const q = busquedaTecnico.trim().toLowerCase();
    if (!q) return listaMecanicosUnica;
    return listaMecanicosUnica.filter((m) => m.toLowerCase().includes(q));
  }, [listaMecanicosUnica, busquedaTecnico]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMostrarDropdownClientes(false);
      }
      if (dropdownTecnicoRef.current && !dropdownTecnicoRef.current.contains(event.target as Node)) {
        setMostrarDropdownTecnicos(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const abrirFlotanteVehiculo = (tab: "marca" | "modelo" = "marca") => {
    setTabFlotanteVehiculo(tab);
    setBusquedaFlotanteVehiculo("");
    setMostrarFlotanteVehiculo(true);
  };

  // Marcas para el flotante
  const marcasFlotante = useMemo(() => {
    const q = busquedaFlotanteVehiculo.trim().toLowerCase();
    const todas = Object.keys(CATALOGO_VEHICULOS);
    if (!q) return todas;
    return todas.filter((m) => m.toLowerCase().includes(q));
  }, [busquedaFlotanteVehiculo]);

  // Modelos para el flotante (filtrados por la marca seleccionada)
  const modelosFlotante = useMemo(() => {
    const q = busquedaFlotanteVehiculo.trim().toLowerCase();
    const marcaKey = Object.keys(CATALOGO_VEHICULOS).find(
      (m) => m.toLowerCase() === vehiculoMarca.trim().toLowerCase()
    );
    let pool: string[] = [];
    if (marcaKey) {
      pool = CATALOGO_VEHICULOS[marcaKey].modelos;
    } else {
      pool = Array.from(new Set(Object.values(CATALOGO_VEHICULOS).flatMap((v) => v.modelos)));
    }
    if (!q) return pool;
    return pool.filter((mod) => mod.toLowerCase().includes(q));
  }, [vehiculoMarca, busquedaFlotanteVehiculo]);

  const seleccionarMarcaFlotante = (marca: string) => {
    setVehiculoMarca(marca);
    const infoMarca = CATALOGO_VEHICULOS[marca];
    if (infoMarca?.tipo && vehiculoTipo === "Auto") {
      setVehiculoTipo(infoMarca.tipo);
    }
    // Pasar a escoger el modelo
    setTabFlotanteVehiculo("modelo");
    setBusquedaFlotanteVehiculo("");
  };

  const seleccionarModeloFlotante = (modelo: string) => {
    setVehiculoModelo(modelo);
    const tipoDetectado = detectarCarroceria(modelo, vehiculoMarca);
    if (tipoDetectado) {
      setVehiculoTipo(tipoDetectado);
    }
    setMostrarFlotanteVehiculo(false);
  };

  const [listaClientes, setListaClientes] = useState<any[]>(clientesCatalogo || []);

  useEffect(() => {
    if (Array.isArray(clientesCatalogo) && clientesCatalogo.length > 0) {
      setListaClientes(clientesCatalogo);
    } else {
      fetch("/api/clientes")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d.success && Array.isArray(d.clientes)) {
            setListaClientes(d.clientes);
          }
        })
        .catch(() => { });
    }
  }, [clientesCatalogo]);

  // Filtrado reactivo en catálogo de clientes
  const clientesFiltrados = useMemo(() => {
    const q = busquedaCliente.trim().toLowerCase();
    if (!q) return [];
    return (listaClientes || []).filter((c) => {
      const matchName = c.name?.toLowerCase().includes(q);
      const matchDoc = c.identification?.toLowerCase().includes(q);
      const matchPhone = c.phone?.toLowerCase().includes(q);
      const matchEmail = c.email?.toLowerCase().includes(q);
      const matchPlate = c.vehicles?.some((v: any) => v.plate?.toLowerCase().includes(q));
      return matchName || matchDoc || matchPhone || matchEmail || matchPlate;
    }).slice(0, 10);
  }, [busquedaCliente, listaClientes]);

  // Al elegir un cliente del catálogo (estilo POS)
  const handleSeleccionarCliente = (c: any) => {
    const qPrevio = busquedaCliente.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    setClienteSeleccionado(c);
    setMostrarDropdownClientes(false);
    setMostrarFormNuevoCliente(false);
    setBusquedaCliente(c.name || "");
    setEmailContacto(c.email || "");
    setNuevoClienteEmail(c.email || "");
    setNuevoClienteDireccion(c.address || "");
    setNuevoClienteFoto(c.avatar || c.imageUrl || null);

    // Si acaba de escanear una matrícula NUEVA que no existe en BD, mantener esa placa lista en Paso 2
    if (matriculaEscaneadaInfo && !matriculaEscaneadaInfo.existe && matriculaEscaneadaInfo.placa) {
      setVehiculoSeleccionadoId("NUEVO");
      setVehiculoPlaca(matriculaEscaneadaInfo.placa);
      setVehiculoMarca("");
      setVehiculoModelo("");
      setVehiculoKm("");
      setMostrarFormNuevoVehiculo(true);
      setSubPasoVehiculo("marca");
      setPasoActivo(2);
      return;
    }

    // Si tiene vehículos asociados en Neon, precargar el que coincida con la búsqueda o el primero
    if (Array.isArray(c.vehicles) && c.vehicles.length > 0) {
      const vehiculoCoincidente =
        qPrevio.length >= 3
          ? c.vehicles.find((vh: any) =>
            String(vh.plate || "")
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .includes(qPrevio)
          )
          : null;
      const v = vehiculoCoincidente || c.vehicles[0];
      setVehiculoSeleccionadoId(v.id || "0");
      setVehiculoPlaca(v.plate || "");
      setVehiculoMarca(v.brand || "");
      setVehiculoModelo(v.model || "");
      setVehiculoKm(v.mileage ? String(v.mileage) : "");
      setMostrarFormNuevoVehiculo(false);
    } else {
      setVehiculoSeleccionadoId("NUEVO");
      setVehiculoPlaca("");
      setVehiculoMarca("");
      setVehiculoModelo("");
      setVehiculoKm("");
      setMostrarFormNuevoVehiculo(true);
    }

    // Avanzar suavemente al paso de Vehículo
    setPasoActivo(2);
  };

  // Al elegir registrar un nuevo cliente (formulario igual a Clientes)
  const handleIniciarNuevoCliente = () => {
    setClienteSeleccionado(null);
    setMostrarFormNuevoCliente(true);
    setSubPasoCliente("tipo");
    setMostrarDropdownClientes(false);
    setNuevoClienteNombre(busquedaCliente.trim());
    setNuevoClienteIdentificacion("");
    setNuevoClienteTelefono("");
    setNuevoClienteEmail("");
    setNuevoClienteDireccion("");
    setNuevoClienteFoto(null);
  };

  // Validar datos del cliente nuevo en memoria, detectar si ya existe para no duplicar y pasar al paso de vehículo
  const handleGuardarClienteYPasarVehiculo = async () => {
    if (!nuevoClienteNombre.trim()) {
      mostrarToast(
        tipoCliente === "Empresa"
          ? "Ingresa la razón social de la empresa"
          : "Ingresa los nombres y apellidos del cliente",
        "err"
      );
      return;
    }

    // Si está creando (no editando un cliente ya seleccionado explícitamente), detectar si ya existe en BD/catálogo
    if (!editOrderId && !clienteSeleccionado?.id) {
      const nomNorm = nuevoClienteNombre.trim().toLowerCase();
      const identNorm = nuevoClienteIdentificacion.trim().toLowerCase();
      const telDigits = nuevoClienteTelefono.replace(/\D/g, "");
      const emailNorm = nuevoClienteEmail.trim().toLowerCase();

      const coincideCliente = (c: any) => {
        if (!c) return false;
        const cIdent = String(c.identification || "").trim().toLowerCase();
        const cName = String(c.name || "").trim().toLowerCase();
        const cTel = String(c.phone || "").replace(/\D/g, "");
        const cEmail = String(c.email || "").trim().toLowerCase();

        if (identNorm && identNorm.length >= 4 && cIdent === identNorm) return true;
        if (emailNorm && cEmail && cEmail === emailNorm) return true;
        if (telDigits.length >= 7 && cTel.length >= 7 && cTel === telDigits) return true;
        if (nomNorm && cName === nomNorm) return true;
        return false;
      };

      let clienteExistente = (listaClientes || []).find(coincideCliente) || null;

      if (!clienteExistente) {
        const qBuscar =
          nuevoClienteIdentificacion.trim() ||
          nuevoClienteTelefono.trim() ||
          nuevoClienteEmail.trim() ||
          nuevoClienteNombre.trim();
        if (qBuscar.length >= 3) {
          try {
            const res = await fetch(`/api/taller/operacion?searchCustomer=${encodeURIComponent(qBuscar)}`);
            const data = await res.json().catch(() => null);
            if (data?.success && Array.isArray(data.clientes)) {
              clienteExistente = data.clientes.find(coincideCliente) || null;
              if (clienteExistente) {
                setListaClientes((prev) =>
                  prev.some((item) => item.id === clienteExistente.id) ? prev : [clienteExistente, ...prev]
                );
              }
            }
          } catch { }
        }
      }

      if (clienteExistente) {
        setClienteSeleccionado(clienteExistente);
        setMostrarFormNuevoCliente(false);
        setBusquedaCliente(clienteExistente.name || nuevoClienteNombre.trim());
        setNuevoClienteNombre(clienteExistente.name || nuevoClienteNombre.trim());
        setNuevoClienteIdentificacion(clienteExistente.identification || nuevoClienteIdentificacion.trim());
        setNuevoClienteTelefono(clienteExistente.phone || nuevoClienteTelefono.trim());
        setNuevoClienteEmail(nuevoClienteEmail.trim() || clienteExistente.email || "");
        setEmailContacto(nuevoClienteEmail.trim() || clienteExistente.email || "");
        setNuevoClienteDireccion(nuevoClienteDireccion.trim() || clienteExistente.address || "");
        mostrarToast(
          `Cliente existente detectado: ${clienteExistente.name}. Selecciona o registra su vehículo.`,
          "ok"
        );
        setPasoActivo(2);
        return;
      }
    }

    setPasoActivo(2);
  };


  // Al elegir un vehículo existente del cliente
  const handleSeleccionarVehiculo = (v: any) => {
    setVehiculoSeleccionadoId(v.id);
    setVehiculoPlaca(v.plate || "");
    setVehiculoMarca(v.brand || "");
    setVehiculoModelo(v.model || "");
    setVehiculoKm(v.mileage ? String(v.mileage) : "");
    setVehiculoFoto(v.imageUrl || null);
    setMostrarFormNuevoVehiculo(false);
    // Avanzar suavemente al paso de la orden
    setPasoActivo(3);
  };

  const resetFormularioCompleto = () => {
    detenerCamara();
    setMostrarEscanerMatricula(false);
    setMatriculaEscaneadaInfo(null);
    setPlacaDetectadaInput("");
    setPreviewImagenUrl(null);
    setEstadoEscaneo("");
    setPasoActivo(1);
    setTipoCliente("Persona");
    setBusquedaCliente("");
    setMostrarDropdownClientes(false);
    setClienteSeleccionado(null);
    setMostrarFormNuevoCliente(false);
    setNuevoClienteIdentificacion("");
    setNuevoClienteNombre("");
    setNuevoClienteTelefono("");
    setNuevoClienteEmail("");
    setNuevoClienteDireccion("");
    setNuevoClienteFoto(null);
    setVehiculoSeleccionadoId("NUEVO");
    setVehiculoPlaca("");
    setVehiculoMarca("");
    setVehiculoModelo("");
    setVehiculoAnio(String(new Date().getFullYear()));
    setVehiculoKm("");
    setVehiculoTipo("Auto");
    setVehiculoFoto(null);
    setMostrarFormNuevoVehiculo(false);
    setEmailContacto("");
    setMotivoIngreso("");
    setTipoIngreso("Taller");
    setNivelCombustible("1/2");
    setPorcentajeCombustible(50);
    setInventarioTrae(["Gata", "Llave", "Repuesto", "Matrícula"]);
    setItemManualInventario("");
    setFotosIniciales([]);
    setEvidenciasMetadata([]);
    setSubiendoFoto(false);
    setVideosIniciales([]);
    setNotasVozIniciales([]);
    setPanelMultimedia(null);
    detenerTracksMedia();
    setIngresadoPor(empleadoLogueado.nombre || "Hernan Marquez");
    setAsignacionesTecnicos([]);
  };

  // Crear la orden directamente en Neon DB y entrar a la página
  const handleCrearOrdenFinal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 1. Validar Cliente
    const usarCamposEditados = Boolean(editOrderId || mostrarFormNuevoCliente);
    const nombreFinal = (
      usarCamposEditados
        ? nuevoClienteNombre || clienteSeleccionado?.name || ""
        : clienteSeleccionado
          ? clienteSeleccionado.name
          : nuevoClienteNombre
    ).trim();

    if (!nombreFinal || nombreFinal.toLowerCase().includes("consumidor final") || nombreFinal.toLowerCase().includes("cliente mostrador")) {
      mostrarToast("Por favor ingresa los datos reales del cliente", "err");
      setPasoActivo(1);
      return;
    }

    // 2. Validar Vehículo
    const placaFinal = vehiculoPlaca.trim().toUpperCase();
    if (!placaFinal || placaFinal === "EXPRESS") {
      mostrarToast("Por favor ingresa la placa real del vehículo", "err");
      setPasoActivo(2);
      return;
    }

    try {
      setCreando(true);
      const mecanicosTexto =
        asignacionesTecnicos.length > 0
          ? asignacionesTecnicos
            .map((a) => a.nombre.trim())
            .filter(Boolean)
            .join(", ")
          : empleadoLogueado.nombre || "Sin asignar";

      const motivoFinal =
        tipoIngreso === "Lubricentro"
          ? `[Lubricentro] ${motivoIngreso.trim() || "Mantenimiento y lubricación"}`
          : tipoIngreso === "Lavado"
            ? `[Lavado] ${motivoIngreso.trim() || "Lavado y detallado general"}`
            : (motivoIngreso.trim() || "Ingreso a taller");

      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editOrderId ? "EDITAR_ORDEN_ETAPA_1" : "CREAR_ORDEN_ETAPA_1",
          orderId: editOrderId || undefined,
          customerId: clienteSeleccionado?.id || undefined,
          vehicleId: vehiculoSeleccionadoId !== "NUEVO" ? vehiculoSeleccionadoId : undefined,
          tipoCliente,
          nombres: nombreFinal,
          avatar: nuevoClienteFoto || clienteSeleccionado?.avatar || clienteSeleccionado?.imageUrl || undefined,
          imageUrl: nuevoClienteFoto || clienteSeleccionado?.imageUrl || clienteSeleccionado?.avatar || undefined,
          identificacion: (
            usarCamposEditados
              ? nuevoClienteIdentificacion
              : clienteSeleccionado?.identification || nuevoClienteIdentificacion
          ).trim(),
          telefono: (
            usarCamposEditados
              ? nuevoClienteTelefono
              : clienteSeleccionado?.phone || nuevoClienteTelefono
          ).trim(),
          email: (
            usarCamposEditados
              ? nuevoClienteEmail
              : emailContacto || nuevoClienteEmail || clienteSeleccionado?.email || ""
          ).trim(),
          direccion: (
            usarCamposEditados
              ? nuevoClienteDireccion
              : clienteSeleccionado?.address || nuevoClienteDireccion || ""
          ).trim(),
          ingresadoPor: ingresadoPor.trim() || empleadoLogueado.nombre,
          mechanic: mecanicosTexto,
          assignedTechnicians: asignacionesTecnicos
            .map((a) => ({
              name: a.nombre.trim(),
              tarea: a.tarea.trim(),
              role: "Técnico",
            }))
            .filter((a) => a.name),
          motivoIngreso: motivoFinal,
          placa: placaFinal,
          marca: vehiculoMarca.trim() || "Vehículo",
          modelo: vehiculoModelo.trim() || "General",
          anio: vehiculoAnio.trim() || String(new Date().getFullYear()),
          tipoVehiculo: vehiculoTipo || "Auto",
          kilometraje: vehiculoKm ? parseInt(vehiculoKm, 10) : (editOrderId ? 0 : undefined),
          vehicleImageUrl: vehiculoFoto || undefined,
          fuelLevel: nivelCombustible,
          receptionInventory: itemManualInventario.trim() && !inventarioTrae.includes(itemManualInventario.trim())
            ? [...inventarioTrae, itemManualInventario.trim()]
            : inventarioTrae,
          receptionPhotos: [
            ...fotosIniciales,
            ...videosIniciales.map((v) => v.url),
            ...notasVozIniciales.map((a) => a.audioUrl || (a as any).url),
          ],
          voiceNotes: notasVozIniciales,
          evidences: evidenciasMetadata,
          branch: getClientActiveBranch("/taller") === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL",
        }),
      });

      const data = await res.json();
      if (data.success && data.activeOrder) {
        if (onOrdenCreada) {
          onOrdenCreada(data.activeOrder, data.customer, tipoIngreso);
        }
        if (mostrarToast) {
          mostrarToast(
            editOrderId ? `Orden #${data.activeOrder.orderNumber} actualizada para ${nombreFinal} (${placaFinal})` : `Orden #${data.activeOrder.orderNumber} creada para ${nombreFinal} (${placaFinal})`
          );
        }
        resetFormularioCompleto();
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem("taller_orden_editar_cache");
            localStorage.setItem("taller_orden_activa_id", String(data.activeOrder.id));
          } catch { }
        }
        if (onClose) {
          onClose();
        } else if (isPageMode) {
          router.push("/taller");
        }
      } else {
        if (mostrarToast) {
          mostrarToast(data.error || "No se pudo crear la orden", "err");
        }
      }
    } catch (err: any) {
      if (mostrarToast) {
        mostrarToast(err.message || "Error al conectar con la base de datos", "err");
      }
    } finally {
      setCreando(false);
    }
  };

  // Si se cierra o cancela sin completar el Paso 3, el número de orden y datos temporales se descartan y NO se guardan
  const handleCancelarSinGuardar = () => {
    resetFormularioCompleto();
    if (onClose) {
      onClose();
    } else if (isPageMode) {
      if (typeof window !== "undefined") {
        window.location.href = "/taller";
      } else {
        router.push("/taller");
      }
    }
  };

      if (!isOpen && !isPageMode) return null;

      const tieneCliente = Boolean(clienteSeleccionado || nuevoClienteNombre.trim());
      const tieneVehiculo = Boolean(vehiculoPlaca.trim());

      // Etiqueta única del paso activo (color diferente por paso: 1=azul, 2=verde, 3=ámbar, 4=púrpura)
      const pasoPill = (() => {
        const pasoConfig: Record<
          number,
          { nombre: string; pill: string; circle: string }
        > = {
          1: {
            nombre: "Cliente",
            pill: "bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/30 text-sky-700 dark:text-sky-300",
            circle: "bg-sky-500 text-white",
          },
          2: {
            nombre: "Vehículo",
            pill: "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
            circle: "bg-emerald-500 text-white",
          },
          3: {
            nombre: "Ingreso",
            pill: "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-700 dark:text-amber-300",
            circle: "bg-amber-500 text-white",
          },
          4: {
            nombre: "Orden",
            pill: "bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/30 text-purple-700 dark:text-purple-300",
            circle: "bg-purple-500 text-white",
          },
        };
        const actual = pasoConfig[pasoActivo] || pasoConfig[1];

        if (editOrderId) {
          return (
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
              {([1, 2, 3, 4] as const).map((num) => {
                const cfg = pasoConfig[num];
                const activo = pasoActivo === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => irAPaso(num)}
                    className={`h-8 px-2.5 sm:px-3 rounded-xl border text-xs flex items-center gap-1.5 select-none transition-all cursor-pointer active:scale-95 ${activo
                      ? `${cfg.pill} font-bold ring-1 ring-current/30 shadow-xs`
                      : "bg-zinc-100/80 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium"
                      }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${activo ? cfg.circle : "bg-zinc-300 dark:bg-white/15 text-zinc-800 dark:text-zinc-200"
                        }`}
                    >
                      {num}
                    </span>
                    <span>{cfg.nombre}</span>
                  </button>
                );
              })}
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1.5 shrink-0">
            {pasoActivo > 1 ? (
              <button
                type="button"
                onClick={() => irAPaso((pasoActivo - 1) as any)}
                className={`h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl border font-bold text-xs sm:text-sm flex items-center gap-2 select-none transition-all cursor-pointer active:scale-95 animate-fade-in ${actual.pill}`}
                title="Paso actual. Clic para volver al paso anterior."
              >
                <span
                  className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0 shadow-xs ${actual.circle}`}
                >
                  {pasoActivo}
                </span>
                <span className="font-bold">{actual.nombre}</span>
              </button>
            ) : (
              <div
                className={`h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl border font-bold text-xs sm:text-sm flex items-center gap-2 select-none transition-all animate-fade-in ${actual.pill}`}
              >
                <span
                  className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0 shadow-xs ${actual.circle}`}
                >
                  1
                </span>
                <span className="font-bold">{actual.nombre}</span>
              </div>
            )}
          </div>
        );
      })();

      const cardContent = (
        <div className="w-full flex flex-col">
          {/* Etiqueta del paso fuera del recuadro, alineada a la derecha (modo página) */}
          {isPageMode && (
            <div className="flex justify-end mb-2.5">{pasoPill}</div>
          )}
          <div
            onClick={(e) => e.stopPropagation()}
            className={
              isPageMode
                ? "w-full rounded-3xl bg-white dark:bg-[#0c0c0e] border border-zinc-200/80 dark:border-white/[0.08] shadow-xl overflow-hidden flex flex-col divide-y divide-zinc-200/80 dark:divide-white/[0.08] animate-fade-in"
                : "w-full h-[100dvh] sm:h-auto sm:max-w-3xl lg:max-w-4xl bg-white dark:bg-[#0c0c0e] text-zinc-900 dark:text-white border-0 sm:border border-zinc-200/80 dark:border-white/[0.08] rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[90vh] transition-all pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] divide-y divide-zinc-200/80 dark:divide-white/[0.08]"
            }
          >
            {/* Cabecera Superior: Título + Stepper */}
            <div
              className={
                isPageMode
                  ? "p-4 sm:p-5 bg-zinc-50/70 dark:bg-white/[0.02] flex flex-col gap-3 shrink-0"
                  : "px-4 py-3 sm:px-6 sm:py-4 bg-zinc-50/70 dark:bg-white/[0.02] flex flex-col gap-2.5 shrink-0"
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  {isPageMode && (
                    <Link
                      href="/taller"
                      onClick={() => {
                        resetFormularioCompleto();
                      }}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-200/60 hover:bg-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.10] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all flex items-center justify-center shrink-0 active:scale-95 cursor-pointer"
                      title="Cerrar"
                      aria-label="Cerrar"
                    >
                      <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Link>
                  )}

                  <div className="flex flex-col items-start min-w-0 leading-snug">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Orden
                      </span>
                      <span className="font-mono font-bold text-base sm:text-lg md:text-xl text-zinc-900 dark:text-white tracking-tight">
                        #{correlativoOrden}
                      </span>
                    </div>
                    {(asignacionesTecnicos?.[0]?.nombre || empleadoLogueado?.nombre) && (
                      <span
                        onClick={() =>
                          setEtiquetaRolCabecera((prev) =>
                            prev === "Mecánico" ? "Asesor" : "Mecánico"
                          )
                        }
                        title="Clic para alternar etiqueta de rol (Mecánico / Asesor)"
                        className="mt-1 inline-flex items-center gap-2 sm:gap-1.5 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-sm sm:text-xs md:text-[12px] font-medium cursor-pointer select-none transition-colors"
                      >
                        <span className="w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span className="opacity-80">{etiquetaRolCabecera}:</span>
                        <strong className="font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[220px] sm:max-w-none">
                          {asignacionesTecnicos?.[0]?.nombre || empleadoLogueado?.nombre}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Etiqueta del paso dentro de la cabecera solo en modo modal */}
                {!isPageMode && pasoPill}

                {/* Botón X para cerrar (solo en modo modal flotante) */}
                {!isPageMode && (
                  <button
                    type="button"
                    onClick={handleCancelarSinGuardar}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-200/60 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer text-sm shrink-0 min-h-[36px] min-w-[36px]"
                    title="Cerrar sin guardar"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Contenido Principal */}
            <div
              className={
                isPageMode
                  ? "p-4 sm:p-6 lg:p-7 space-y-5 min-h-[360px]"
                  : "flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-5"
              }
            >
              {/* Input oculto para Cámara Nativa de iOS (Apple) y Android */}
              <input
                ref={inputFotoNativaRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFotoNativaCapturada}
                className="hidden"
              />

              {/* =================================================================
              ESCÁNER DE MATRÍCULA EN VIVO (APPLE iOS / ANDROID)
              ================================================================= */}
              {mostrarEscanerMatricula && (
                <div className="p-4 sm:p-5 rounded-3xl bg-zinc-100 dark:bg-[#18181d] border border-emerald-500/40 shadow-2xl space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <circle cx="12" cy="13" r="3" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                          Escanear Matrícula
                        </h4>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        detenerCamara();
                        setMostrarEscanerMatricula(false);
                      }}
                      className="w-8 h-8 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Visor de Cámara o Vista Previa de Captura */}
                  <div className="relative w-full h-52 sm:h-60 rounded-2xl bg-zinc-200 dark:bg-black overflow-hidden border border-zinc-300 dark:border-white/15 flex items-center justify-center">
                    {previewImagenUrl ? (
                      <img
                        src={previewImagenUrl}
                        alt="Captura de matrícula"
                        className="w-full h-full object-contain"
                      />
                    ) : camaraActiva ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <button
                          type="button"
                          onClick={() => inputFotoNativaRef.current?.click()}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs cursor-pointer shadow-md"
                        >
                          📱 Abrir Cámara
                        </button>
                      </div>
                    )}

                    {/* Recuadro guía de enfoque de matrícula */}
                    {(camaraActiva || previewImagenUrl) && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                        <div className="w-4/5 max-w-xs h-20 sm:h-24 rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] relative flex items-center justify-center">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300/80 bg-black/60 px-2 py-0.5 rounded">
                            MATRÍCULA AQUÍ
                          </span>
                        </div>
                      </div>
                    )}

                    {procesandoOcr && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-4 text-center">
                        <div className="w-7 h-7 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                        <span className="text-xs font-semibold text-emerald-300">
                          {estadoEscaneo || "Detectando matrícula..."}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botones de Captura para Celular (En Vivo + Cámara Nativa iOS/Android) */}
                  <div className="flex flex-wrap items-center gap-2">
                    {camaraActiva && !previewImagenUrl && (
                      <button
                        type="button"
                        disabled={procesandoOcr}
                        onClick={capturarDesdeVideoEnVivo}
                        className="flex-1 h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all"
                      >
                        <span>📸</span>
                        <span>Capturar Matrícula</span>
                      </button>
                    )}

                    {previewImagenUrl && (
                      <button
                        type="button"
                        disabled={procesandoOcr}
                        onClick={iniciarCamaraEnVivo}
                        className="h-11 px-3.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-700 dark:text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>↺</span>
                        <span>Repetir</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={procesandoOcr}
                      onClick={() => inputFotoNativaRef.current?.click()}
                      className="h-11 px-4 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <span>📱</span>
                      <span>Cámara Celular / Foto</span>
                    </button>
                  </div>

                  {estadoEscaneo && !procesandoOcr && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2">
                      {estadoEscaneo}
                    </p>
                  )}

                  {/* Confirmación / Lectura rápida de la matrícula detectada */}
                  <div className="pt-1 border-t border-zinc-200 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={placaDetectadaInput}
                        onChange={(e) => setPlacaDetectadaInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            verificarYAplicarMatricula(placaDetectadaInput);
                          }
                        }}
                        placeholder="Ej. ABC-1234"
                        className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-zinc-300 dark:border-white/15 focus:border-emerald-500 text-zinc-900 dark:text-white font-mono font-bold uppercase text-sm tracking-wider focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={procesandoOcr || !placaDetectadaInput.trim()}
                      onClick={() => verificarYAplicarMatricula(placaDetectadaInput)}
                      className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-black font-bold text-xs sm:text-sm cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <span>Verificar Matrícula</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}


              {/* Banner informativo cuando se escaneó una matrícula nueva que no estaba en BD (oculto en móvil) */}
              {matriculaEscaneadaInfo && !matriculaEscaneadaInfo.existe && (
                <div className="hidden sm:flex px-3.5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-between gap-2 text-xs animate-fade-in">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-black font-mono font-bold text-xs">
                      {matriculaEscaneadaInfo.placa}
                    </span>
                    <span className="text-emerald-800 dark:text-emerald-200 font-medium">
                      Matrícula nueva detectada • Completa los datos del cliente y del vehículo
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMatriculaEscaneadaInfo(null)}
                    className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs px-1.5 cursor-pointer"
                    title="Quitar aviso"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* =================================================================
              PASO 1: BUSCADOR Y SELECCIÓN DE CLIENTE (O FORMULARIO COMPLETO)
              ================================================================= */}
              {pasoActivo === 1 && editOrderId && (
                <div className="space-y-4 animate-fade-in">
                  {/* Tarjeta 1: Edición Directa de Cliente */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/90 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-white/10 space-y-4 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 dark:border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <h4 className="text-sm font-bold text-zinc-500 dark:text-zinc-500">
                          Datos del Cliente
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 bg-zinc-200/70 dark:bg-white/5 p-1 rounded-xl">
                        {(["Persona", "Empresa"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTipoCliente(t)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${tipoCliente === t
                              ? "bg-amber-500 text-black shadow-xs"
                              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                              }`}
                          >
                            {t === "Persona" ? "👤 Persona" : "🏢 Empresa"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="sm:col-span-2 flex items-end gap-3">
                        <div className="relative shrink-0">
                          <label
                            title="Subir o cambiar foto de perfil del cliente"
                            className="relative w-14 h-14 rounded-2xl border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 dark:text-emerald-300 flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden group shadow-md active:scale-95"
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleFotoClienteSeleccionada}
                            />
                            {nuevoClienteFoto ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={nuevoClienteFoto}
                                  alt="Foto perfil cliente"
                                  className="w-full h-full object-cover"
                                />
                                {subiendoFotoCliente && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-400 border-t-transparent" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">Cambiar</span>
                                </div>
                              </div>
                            ) : subiendoFotoCliente ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-400 border-t-transparent" />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-emerald-400 dark:text-emerald-300 group-hover:scale-105 transition-transform">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-[9px] font-bold mt-0.5 uppercase tracking-tighter">Foto</span>
                              </div>
                            )}
                          </label>
                          {nuevoClienteFoto && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNuevoClienteFoto(null);
                              }}
                              title="Quitar foto de cliente"
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow cursor-pointer transition-transform hover:scale-110 z-10"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1 block">
                            {tipoCliente === "Empresa" ? "Razón Social" : "Nombre y Apellidos"} <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={nuevoClienteNombre}
                            onChange={(e) => setNuevoClienteNombre(e.target.value)}
                            placeholder={tipoCliente === "Empresa" ? "Ej: Transportes Andinos S.A." : "Ej: Juan Carlos Pérez"}
                            className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-zinc-300 dark:border-white/15 focus:border-amber-500 text-zinc-900 dark:text-white text-sm font-semibold focus:outline-none"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1 block">
                          {tipoCliente === "Empresa" ? "RUC" : "Cédula / Documento"}
                        </label>
                        <input
                          type="text"
                          value={nuevoClienteIdentificacion}
                          onChange={(e) => setNuevoClienteIdentificacion(e.target.value)}
                          placeholder={tipoCliente === "Empresa" ? "Ej: 1790012345001" : "Ej: 0912345678"}
                          className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-zinc-300 dark:border-white/15 focus:border-amber-500 text-zinc-900 dark:text-white font-mono text-sm font-bold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1 block">
                          WhatsApp
                        </label>
                        <input
                          type="tel"
                          value={nuevoClienteTelefono}
                          onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                          placeholder="Ej: 0991234567"
                          className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-zinc-300 dark:border-white/15 focus:border-amber-500 text-zinc-900 dark:text-white font-mono text-sm font-bold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1 block">
                          Correo Electrónico
                        </label>
                        <input
                          type="email"
                          value={nuevoClienteEmail}
                          onChange={(e) => {
                            setNuevoClienteEmail(e.target.value);
                            setEmailContacto(e.target.value);
                          }}
                          placeholder="correo@ejemplo.com"
                          className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-zinc-300 dark:border-white/15 focus:border-amber-500 text-zinc-900 dark:text-white text-sm font-medium focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1 block">
                          Dirección
                        </label>
                        <input
                          type="text"
                          value={nuevoClienteDireccion}
                          onChange={(e) => setNuevoClienteDireccion(e.target.value)}
                          placeholder="Av. Principal y Calle Secundaria"
                          className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-zinc-300 dark:border-white/15 focus:border-amber-500 text-zinc-900 dark:text-white text-sm font-medium focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {pasoActivo === 1 && !editOrderId && (
                <div className="space-y-5 animate-fade-in">

                  {/* Barra de Búsqueda Inteligente con Dropdown + Escáner de Matrícula (Oculta al registrar nuevo cliente o al escanear) */}
                  {!mostrarFormNuevoCliente && !mostrarEscanerMatricula && (
                    <div className="relative" ref={dropdownRef}>
                      {/* Buscador de Cliente */}
                      <div className="relative w-full">
                        <input
                          type="text"
                          value={busquedaCliente}
                          onChange={(e) => {
                            setBusquedaCliente(e.target.value);
                            setMostrarDropdownClientes(true);
                            if (clienteSeleccionado && e.target.value !== clienteSeleccionado.name) {
                              setClienteSeleccionado(null);
                            }
                          }}
                          onFocus={() => {
                            if (busquedaCliente.trim()) setMostrarDropdownClientes(true);
                          }}
                          placeholder="Buscar por cliente, cédula, matrícula o WhatsApp..."
                          className="w-full h-12 pl-11 pr-24 rounded-2xl bg-zinc-100/90 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] focus:border-blue-500 dark:focus:border-blue-500 text-zinc-900 dark:text-white text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all shadow-xs"
                          autoFocus
                        />
                        <svg
                          className="w-4 h-4 text-zinc-400 absolute left-4 top-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                          />
                        </svg>

                        {busquedaCliente && (
                          <button
                            type="button"
                            onClick={() => {
                              setBusquedaCliente("");
                              setClienteSeleccionado(null);
                            }}
                            className="absolute right-3 top-2.5 px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 text-xs font-medium cursor-pointer transition-colors"
                          >
                            Limpiar
                          </button>
                        )}
                      </div>

                      {/* Botones de acción rápida con estética moderna y minimalista */}
                      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mt-2.5">
                        {/* Botón Escanear */}
                        <button
                          type="button"
                          onClick={abrirEscanerMatricula}
                          title="Escanear matrícula con cámara (Apple iOS / Android)"
                          aria-label="Escanear Matrícula"
                          className="h-11 px-2.5 sm:px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 text-xs font-semibold min-h-[44px]"
                        >
                          <svg className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                            <circle cx="12" cy="13" r="3" />
                          </svg>
                          <span className="truncate">Escanear</span>
                        </button>

                        {/* Botón Nuevo */}
                        <button
                          type="button"
                          onClick={handleIniciarNuevoCliente}
                          title="Crear nuevo cliente"
                          aria-label="Crear nuevo cliente"
                          className="h-11 px-2.5 sm:px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/25 active:scale-95 text-xs font-semibold min-h-[44px]"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <line x1="19" x2="19" y1="8" y2="14" />
                            <line x1="22" x2="16" y1="11" y2="11" />
                          </svg>
                          <span className="truncate">Nuevo</span>
                        </button>
                      </div>

                      {/* Lista de Coincidencias al Escribir */}
                      {busquedaCliente.trim().length > 0 && !clienteSeleccionado && (
                        <div className="mt-3 bg-white dark:bg-[#18181c] border border-zinc-200 dark:border-white/15 rounded-2xl shadow-xl p-2 space-y-2">
                          {/* Botón destacado siempre visible arriba SIN DESLIZAR */}
                          <div
                            onClick={handleIniciarNuevoCliente}
                            className="p-2.5 sm:p-3 rounded-xl bg-blue-50 dark:bg-blue-600/15 hover:bg-blue-100 dark:hover:bg-blue-600/25 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-500/30 cursor-pointer transition-all flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                                +
                              </span>
                              <span className="text-xs sm:text-sm font-semibold">
                                Nuevo cliente
                              </span>
                            </div>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Crear →</span>
                          </div>

                          {/* Scroll únicamente para los resultados existentes */}
                          {clientesFiltrados.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                              {clientesFiltrados.map((c) => (
                                <div
                                  key={c.id}
                                  onClick={() => handleSeleccionarCliente(c)}
                                  className="p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 cursor-pointer transition-all flex items-center justify-between gap-3 group bg-zinc-50/70 dark:bg-white/[0.02] border border-zinc-200/60 dark:border-white/5"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm shrink-0 border border-blue-500/25 group-hover:scale-105 transition-transform">
                                      {(c.name || "C").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{c.name}</p>
                                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                                        {c.identification && (
                                          <span className="font-mono text-zinc-800 dark:text-zinc-300 font-bold">{c.identification}</span>
                                        )}
                                        {c.phone && <span>• WhatsApp: {c.phone}</span>}
                                        {c.email && (
                                          <span className="truncate max-w-[160px]"> • {c.email}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 font-semibold">
                                      {c.vehicles?.length || 0} auto(s)
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 text-center text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                              Sin resultados
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Si ya seleccionó un cliente existente (Card Resumen estilo POS) */}
                  {clienteSeleccionado && !mostrarFormNuevoCliente && (
                    <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-600/[0.08] border border-blue-200 dark:border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in shadow-xs">
                      <div className="flex items-center gap-3.5">
                        {clienteSeleccionado.avatar || clienteSeleccionado.imageUrl ? (
                          <img
                            src={clienteSeleccionado.avatar || clienteSeleccionado.imageUrl}
                            alt={clienteSeleccionado.name}
                            className="w-12 h-12 rounded-2xl object-cover shadow-md shrink-0 border border-white/10"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-md shadow-blue-600/30 shrink-0">
                            {(clienteSeleccionado.name || "C").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                              {clienteSeleccionado.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-bold">
                              ✓ Seleccionado
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 text-xs text-zinc-600 dark:text-zinc-400 font-medium mt-0.5">
                            {clienteSeleccionado.identification && (
                              <span className="font-mono text-zinc-800 dark:text-zinc-300 font-bold">
                                Doc: {clienteSeleccionado.identification}
                              </span>
                            )}
                            {clienteSeleccionado.phone && (
                              <span>WhatsApp: {clienteSeleccionado.phone}</span>
                            )}
                            {clienteSeleccionado.email && (
                              <span>Email: {clienteSeleccionado.email}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setNuevoClienteNombre(clienteSeleccionado.name || "");
                            setNuevoClienteIdentificacion(clienteSeleccionado.identification || "");
                            setNuevoClienteTelefono(clienteSeleccionado.phone || "");
                            setNuevoClienteEmail(clienteSeleccionado.email || "");
                            setNuevoClienteDireccion(clienteSeleccionado.address || "");
                            setNuevoClienteFoto(clienteSeleccionado.avatar || clienteSeleccionado.imageUrl || null);
                            setTipoCliente(clienteSeleccionado.type === "Empresa" ? "Empresa" : "Persona");
                            setMostrarFormNuevoCliente(true);
                            setSubPasoCliente("nombre");
                          }}
                          className="h-9 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 font-semibold cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <span>✎</span>
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setClienteSeleccionado(null);
                            setBusquedaCliente("");
                          }}
                          className="h-9 px-3 rounded-xl bg-zinc-200/80 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs text-zinc-800 dark:text-zinc-200 font-medium cursor-pointer transition-colors"
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={() => setPasoActivo(2)}
                          className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/30 active:scale-95"
                        >
                          <span>Continuar</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Formulario de Cliente Nuevo — Flujo Deslizable Paso a Paso */}
                  {mostrarFormNuevoCliente && (() => {
                    const PASOS_CLIENTE = [
                      { id: "tipo" as const, label: "Tipo", icon: "👤" },
                      { id: "nombre" as const, label: tipoCliente === "Empresa" ? "Razón Social" : "Nombre", icon: "📝" },
                      { id: "identificacion" as const, label: tipoCliente === "Empresa" ? "RUC" : "Cédula", icon: "🪪" },
                      { id: "telefono" as const, label: "Teléfono", icon: "📱" },
                      { id: "email" as const, label: "Correo", icon: "✉️" },
                      { id: "direccion" as const, label: "Dirección", icon: "📍" },
                    ];

                    const pasoIdx = PASOS_CLIENTE.findIndex((p) => p.id === subPasoCliente);

                    const getValorCliente = (id: typeof subPasoCliente) => {
                      if (id === "tipo") return tipoCliente;
                      if (id === "nombre") return nuevoClienteNombre;
                      if (id === "identificacion") return nuevoClienteIdentificacion;
                      if (id === "telefono") return nuevoClienteTelefono;
                      if (id === "email") return nuevoClienteEmail;
                      if (id === "direccion") return nuevoClienteDireccion;
                      return "";
                    };

                    const avanzarCliente = () => {
                      if (subPasoCliente === "tipo") {
                        setSubPasoCliente("nombre");
                      } else if (subPasoCliente === "nombre") {
                        if (!nuevoClienteNombre.trim()) {
                          mostrarToast(tipoCliente === "Empresa" ? "Ingresa la razón social" : "Ingresa nombres y apellidos", "err");
                          return;
                        }
                        setSubPasoCliente("identificacion");
                      } else if (subPasoCliente === "identificacion") {
                        setSubPasoCliente("telefono");
                      } else if (subPasoCliente === "telefono") {
                        setSubPasoCliente("email");
                      } else if (subPasoCliente === "email") {
                        setSubPasoCliente("direccion");
                      } else if (subPasoCliente === "direccion") {
                        handleGuardarClienteYPasarVehiculo();
                      }
                    };

                    const retrocederCliente = () => {
                      if (subPasoCliente === "nombre") {
                        setSubPasoCliente("tipo");
                      } else if (subPasoCliente === "identificacion") {
                        setSubPasoCliente("nombre");
                      } else if (subPasoCliente === "telefono") {
                        setSubPasoCliente("identificacion");
                      } else if (subPasoCliente === "email") {
                        setSubPasoCliente("telefono");
                      } else if (subPasoCliente === "direccion") {
                        setSubPasoCliente("email");
                      }
                    };

                    return (
                      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-50/90 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-white/10 space-y-5 shadow-xs transition-all animate-fade-in">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-white/5 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                              Cliente
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setMostrarFormNuevoCliente(false)}
                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                          >
                            ← Volver
                          </button>
                        </div>

                        {/* Barra de Progreso Deslizable / Breadcrumbs Interactivos */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                          {PASOS_CLIENTE.map((p, idx) => {
                            const esActivo = p.id === subPasoCliente;
                            const valor = getValorCliente(p.id);
                            const esCompletado = idx < pasoIdx || Boolean(String(valor || "").trim());

                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  // Permitir volver o avanzar si el nombre ya está
                                  if (idx <= 1 || nuevoClienteNombre.trim()) {
                                    setSubPasoCliente(p.id);
                                  } else {
                                    mostrarToast("Primero ingresa el nombre del cliente", "err");
                                  }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${esActivo
                                  ? "bg-emerald-500 text-black shadow-sm font-bold scale-[1.02]"
                                  : esCompletado
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                                    : "bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                                  }`}
                              >
                                <span>{p.icon}</span>
                                <span>{p.label}</span>
                                {esCompletado && (
                                  <span className={esActivo ? "text-black font-bold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Tarjeta del Campo Activo */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 shadow-xs space-y-4 animate-fade-in">

                          {/* ================= PASO 1: TIPO DE CLIENTE ================= */}
                          {subPasoCliente === "tipo" && (
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                                  Tipo de Cliente
                                </label>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTipoCliente("Persona");
                                    setSubPasoCliente("nombre");
                                  }}
                                  className={`p-5 rounded-2xl border-2 flex items-center gap-4 transition-all cursor-pointer text-left active:scale-[0.99] ${tipoCliente === "Persona"
                                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-sm font-bold"
                                    : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500/50"
                                    }`}
                                >
                                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center text-2xl shadow-xs shrink-0">
                                    👤
                                  </div>
                                  <div>
                                    <span className="text-sm font-bold block">Persona</span>
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setTipoCliente("Empresa");
                                    setSubPasoCliente("nombre");
                                  }}
                                  className={`p-5 rounded-2xl border-2 flex items-center gap-4 transition-all cursor-pointer text-left active:scale-[0.99] ${tipoCliente === "Empresa"
                                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-sm font-bold"
                                    : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500/50"
                                    }`}
                                >
                                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center text-2xl shadow-xs shrink-0">
                                    🏢
                                  </div>
                                  <div>
                                    <span className="text-sm font-bold block">Empresa</span>
                                  </div>
                                </button>
                              </div>

                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={avanzarCliente}
                                  className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-98"
                                >
                                  <span>Siguiente</span>
                                  <span>→</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ================= PASO 2: NOMBRE O RAZÓN SOCIAL ================= */}
                          {subPasoCliente === "nombre" && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                                  {tipoCliente === "Empresa" ? "Razón Social" : "Nombre y Apellidos"} <span className="text-rose-500">*</span>
                                </label>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={nuevoClienteNombre}
                                    onChange={(e) => setNuevoClienteNombre(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        avanzarCliente();
                                      }
                                    }}
                                    placeholder={tipoCliente === "Empresa" ? "Ej: Transportes Andinos S.A." : "Ej: Juan Carlos Pérez"}
                                    className="w-full h-14 px-4 rounded-2xl bg-zinc-50 dark:bg-black/50 border-2 border-zinc-300 dark:border-white/15 focus:border-emerald-500 text-zinc-900 dark:text-white text-lg font-semibold placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none shadow-sm"
                                    autoFocus
                                  />
                                </div>

                                {/* Icono para Tomar o Cargar Foto de Perfil (Lado Derecho) */}
                                <div className="relative shrink-0 z-30">
                                  {/* Input para Cámara Móvil Directa */}
                                  <input
                                    ref={fileInputClienteCamaraRef}
                                    type="file"
                                    accept="image/*"
                                    capture="user"
                                    className="hidden"
                                    onChange={handleFotoClienteSeleccionada}
                                  />
                                  {/* Input para Galería / Archivo */}
                                  <input
                                    ref={fileInputClienteGaleriaRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFotoClienteSeleccionada}
                                  />

                                  <button
                                    type="button"
                                    onClick={() => setMostrarMenuFotoCliente((prev) => !prev)}
                                    title="Tomar foto con el móvil o subir de galería"
                                    className="relative w-14 h-14 rounded-2xl border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 dark:text-emerald-300 flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden group shadow-md active:scale-95"
                                  >
                                    {nuevoClienteFoto ? (
                                      <div className="relative w-full h-full">
                                        <img
                                          src={nuevoClienteFoto}
                                          alt="Foto perfil"
                                          className="w-full h-full object-cover"
                                        />
                                        {subiendoFotoCliente && (
                                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-400 border-t-transparent" />
                                          </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">Cambiar</span>
                                        </div>
                                      </div>
                                    ) : subiendoFotoCliente ? (
                                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-400 border-t-transparent" />
                                    ) : (
                                      <div className="flex flex-col items-center justify-center text-emerald-400 dark:text-emerald-300 group-hover:scale-105 transition-transform">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="text-[9px] font-bold mt-0.5 uppercase tracking-tighter">Foto</span>
                                      </div>
                                    )}
                                  </button>

                                  {nuevoClienteFoto && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNuevoClienteFoto(null);
                                      }}
                                      title="Quitar foto"
                                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow cursor-pointer transition-transform hover:scale-110 z-10"
                                    >
                                      ✕
                                    </button>
                                  )}

                                  {/* Menú Flotante: Tomar con Cámara Móvil o Subir de Galería */}
                                  {mostrarMenuFotoCliente && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-[90]"
                                        onClick={() => setMostrarMenuFotoCliente(false)}
                                      />
                                      <div className="absolute right-0 top-full mt-2 w-36 sm:w-40 p-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-900/10 dark:shadow-black/70 z-[100] animate-in fade-in zoom-in-95">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMostrarMenuFotoCliente(false);
                                            fileInputClienteCamaraRef.current?.click();
                                          }}
                                          className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300 flex items-center gap-2 cursor-pointer transition-colors"
                                        >
                                          <span className="text-base">📸</span>
                                          <span>Cámara</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMostrarMenuFotoCliente(false);
                                            fileInputClienteGaleriaRef.current?.click();
                                          }}
                                          className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300 flex items-center gap-2 cursor-pointer transition-colors"
                                        >
                                          <span className="text-base">🖼️</span>
                                          <span>Galería</span>
                                        </button>
                                        {nuevoClienteFoto && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setMostrarMenuFotoCliente(false);
                                              setNuevoClienteFoto(null);
                                            }}
                                            className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 flex items-center gap-2 cursor-pointer transition-colors border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-1"
                                          >
                                            <span className="text-base">🗑️</span>
                                            <span>Quitar</span>
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={retrocederCliente}
                                  className="h-12 px-5 rounded-xl border border-zinc-300 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shrink-0"
                                >
                                  <span>←</span>
                                  <span>Atrás</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={avanzarCliente}
                                  disabled={!nuevoClienteNombre.trim()}
                                  className={`flex-1 h-12 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 ${nuevoClienteNombre.trim()
                                    ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/20"
                                    : "bg-zinc-200 dark:bg-white/5 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                                    }`}
                                >
                                  <span>Siguiente</span>
                                  <span>→</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ================= PASO 3: CÉDULA / RUC ================= */}
                          {subPasoCliente === "identificacion" && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                                  {tipoCliente === "Empresa" ? "Número de RUC" : "Número de Cédula"} <span className="text-rose-500">*</span>
                                </label>
                              </div>

                              <div>
                                <input
                                  type="text"
                                  value={nuevoClienteIdentificacion}
                                  onChange={(e) => setNuevoClienteIdentificacion(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      avanzarCliente();
                                    }
                                  }}
                                  placeholder={tipoCliente === "Empresa" ? "Ej: 1790012345001" : "Ej: 0912345678"}
                                  className="w-full h-14 px-4 rounded-2xl bg-zinc-50 dark:bg-black/50 border-2 border-zinc-300 dark:border-white/15 focus:border-emerald-500 text-zinc-900 dark:text-white font-mono text-xl font-bold placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none shadow-sm"
                                  autoFocus
                                />
                              </div>

                              <div className="pt-2 flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={retrocederCliente}
                                  className="h-12 px-5 rounded-xl border border-zinc-300 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shrink-0"
                                >
                                  <span>←</span>
                                  <span>Atrás</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={avanzarCliente}
                                  className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-98"
                                >
                                  <span>Siguiente</span>
                                  <span>→</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ================= PASO 4: WHATSAPP ================= */}
                          {subPasoCliente === "telefono" && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                                  WhatsApp <span className="text-rose-500">*</span>
                                </label>
                              </div>

                              <div>
                                <input
                                  type="tel"
                                  value={nuevoClienteTelefono}
                                  onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      avanzarCliente();
                                    }
                                  }}
                                  placeholder="Ej: 0991234567"
                                  className="w-full h-14 px-4 rounded-2xl bg-zinc-50 dark:bg-black/50 border-2 border-zinc-300 dark:border-white/15 focus:border-emerald-500 text-zinc-900 dark:text-white font-mono text-xl font-bold placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none shadow-sm"
                                  autoFocus
                                />
                              </div>

                              <div className="pt-2 flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={retrocederCliente}
                                  className="h-12 px-5 rounded-xl border border-zinc-300 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shrink-0"
                                >
                                  <span>←</span>
                                  <span>Atrás</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={avanzarCliente}
                                  className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-98"
                                >
                                  <span>Siguiente</span>
                                  <span>→</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ================= PASO 5: CORREO ELECTRÓNICO ================= */}
                          {subPasoCliente === "email" && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                                  Correo Electrónico (Opcional)
                                </label>
                              </div>

                              <div>
                                <input
                                  type="email"
                                  value={nuevoClienteEmail}
                                  onChange={(e) => {
                                    setNuevoClienteEmail(e.target.value);
                                    setEmailContacto(e.target.value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      avanzarCliente();
                                    }
                                  }}
                                  placeholder="correo@ejemplo.com"
                                  className="w-full h-14 px-4 rounded-2xl bg-zinc-50 dark:bg-black/50 border-2 border-zinc-300 dark:border-white/15 focus:border-emerald-500 text-zinc-900 dark:text-white text-lg font-semibold placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none shadow-sm"
                                  autoFocus
                                />
                              </div>

                              <div className="pt-2 flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={retrocederCliente}
                                  className="h-12 px-5 rounded-xl border border-zinc-300 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shrink-0"
                                >
                                  <span>←</span>
                                  <span>Atrás</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={avanzarCliente}
                                  className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-98"
                                >
                                  <span>Siguiente</span>
                                  <span>→</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ================= PASO 6: DIRECCIÓN ================= */}
                          {subPasoCliente === "direccion" && (
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                                  Dirección (Opcional)
                                </label>
                              </div>

                              <div>
                                <input
                                  type="text"
                                  value={nuevoClienteDireccion}
                                  onChange={(e) => setNuevoClienteDireccion(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleGuardarClienteYPasarVehiculo();
                                    }
                                  }}
                                  placeholder="Av. Principal y Calle Secundaria"
                                  className="w-full h-14 px-4 rounded-2xl bg-zinc-50 dark:bg-black/50 border-2 border-zinc-300 dark:border-white/15 focus:border-emerald-500 text-zinc-900 dark:text-white text-lg font-semibold placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none shadow-sm"
                                  autoFocus
                                />
                              </div>

                              <div className="pt-2 flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={retrocederCliente}
                                  className="h-12 px-5 rounded-xl border border-zinc-300 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shrink-0"
                                >
                                  <span>←</span>
                                  <span>Atrás</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleGuardarClienteYPasarVehiculo}
                                  disabled={guardandoCliente}
                                  className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-98 disabled:opacity-50"
                                >
                                  <span>{guardandoCliente ? "Guardando..." : "Continuar"}</span>
                                  <span>→</span>
                                </button>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* =================================================================
              PASO 2: VEHÍCULO DEL CLIENTE (SELECCIÓN O FORMULARIO NUEVO)
              ================================================================= */}
              {pasoActivo === 2 && editOrderId && (
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/90 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-white/10 space-y-4 shadow-xs animate-fade-in">
                  <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <h4 className="text-sm font-bold text-zinc-500 dark:text-zinc-500">
                        Editar Vehículo de la Orden
                      </h4>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="relative shrink-0 self-start">
                      <label
                        title="Subir o cambiar foto del vehículo"
                        className="relative w-16 h-16 rounded-2xl border-2 border-dashed border-blue-500/50 hover:border-blue-400 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 dark:text-blue-300 flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden group shadow-md active:scale-95"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFotoVehiculoSeleccionada}
                        />
                        {vehiculoFoto ? (
                          <div className="relative w-full h-full">
                            <img
                              src={vehiculoFoto}
                              alt="Foto perfil vehículo"
                              className="w-full h-full object-cover"
                            />
                            {subiendoFotoVehiculo && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">Cambiar</span>
                            </div>
                          </div>
                        ) : subiendoFotoVehiculo ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-blue-400 dark:text-blue-300 group-hover:scale-105 transition-transform">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-[9px] font-bold mt-0.5 uppercase tracking-tighter">Foto</span>
                          </div>
                        )}
                      </label>
                      {vehiculoFoto && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setVehiculoFoto(null);
                          }}
                          title="Quitar foto de vehículo"
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow cursor-pointer transition-transform hover:scale-110 z-10"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1 block">
                          🔢 Placa del Vehículo <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={vehiculoPlaca}
                          onChange={(e) => setVehiculoPlaca(e.target.value.toUpperCase())}
                          placeholder="Ej: ABC-1234"
                          className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-zinc-300 dark:border-white/15 focus:border-amber-500 text-zinc-900 dark:text-white font-mono text-sm font-bold uppercase tracking-wider focus:outline-none"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1 block">
                          🏷️ Marca
                        </label>
                        <input
                          type="text"
                          value={vehiculoMarca}
                          onChange={(e) => setVehiculoMarca(e.target.value)}
                          placeholder="Ej: Skoda, Toyota..."
                          className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-zinc-300 dark:border-white/15 focus:border-amber-500 text-zinc-900 dark:text-white text-sm font-semibold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1 block">
                          🚘 Modelo
                        </label>
                        <input
                          type="text"
                          value={vehiculoModelo}
                          onChange={(e) => setVehiculoModelo(e.target.value)}
                          placeholder="Ej: Fabia, Hilux..."
                          className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-zinc-300 dark:border-white/15 focus:border-amber-500 text-zinc-900 dark:text-white text-sm font-semibold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1 block">
                          📅 Año
                        </label>
                        <input
                          type="text"
                          value={vehiculoAnio}
                          onChange={(e) => setVehiculoAnio(e.target.value)}
                          placeholder="2026"
                          maxLength={4}
                          className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-zinc-300 dark:border-white/15 focus:border-amber-500 text-zinc-900 dark:text-white font-mono text-sm font-bold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1 block">
                          🛣️ Kilometraje (km)
                        </label>
                        <input
                          type="number"
                          value={vehiculoKm}
                          onChange={(e) => setVehiculoKm(e.target.value)}
                          placeholder="Ej: 45000"
                          className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-zinc-300 dark:border-white/15 focus:border-amber-500 text-zinc-900 dark:text-white font-mono text-sm font-bold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1 block">
                          🚗 Tipo de Vehículo
                        </label>
                        <select
                          value={vehiculoTipo}
                          onChange={(e) => setVehiculoTipo(e.target.value)}
                          className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-zinc-300 dark:border-white/15 focus:border-amber-500 text-zinc-900 dark:text-white text-sm font-semibold focus:outline-none"
                        >
                          {["Auto", "SUV", "Camioneta", "Moto", "Camión"].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {pasoActivo === 2 && !editOrderId && (
                <div className="space-y-5 animate-fade-in">
                  {/* Si el cliente ya tiene vehículos registrados en Neon */}
                  {clienteSeleccionado?.vehicles?.length > 0 && !mostrarFormNuevoVehiculo && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {clienteSeleccionado.vehicles.map((v: any) => {
                          const seleccionado = vehiculoSeleccionadoId === v.id;
                          return (
                            <div
                              key={v.id}
                              onClick={() => handleSeleccionarVehiculo(v)}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${seleccionado
                                ? "bg-blue-600/15 border-blue-500 shadow-md ring-1 ring-blue-500/50"
                                : "bg-zinc-50/80 hover:bg-zinc-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] border-zinc-200 dark:border-white/10"
                                }`}
                            >
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                                  {[v.brand, v.model].filter(Boolean).join(" ")
                                    ? `${[v.brand, v.model].filter(Boolean).join(" ")} ${v.year ? `(${v.year})` : ""}`.trim()
                                    : v.plate}
                                </p>
                                <div>
                                  <span className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-black/60 border border-zinc-300 dark:border-white/10 font-mono text-xs font-bold text-zinc-900 dark:text-zinc-200 inline-block">
                                    {v.plate}
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                {seleccionado ? (
                                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="px-3 py-1.5 rounded-xl bg-zinc-200/60 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                    Elegir →
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Botón para agregar otro vehículo si lo desea */}
                        <button
                          type="button"
                          onClick={() => {
                            setVehiculoSeleccionadoId("NUEVO");
                            setVehiculoPlaca("");
                            setVehiculoMarca("");
                            setVehiculoModelo("");
                            setVehiculoKm("");
                            setMostrarFormNuevoVehiculo(true);
                            setSubPasoVehiculo("placa");
                          }}
                          className="p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-white/15 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 min-h-[72px]"
                        >
                          <span className="text-base font-bold">+</span>
                          <span>Registrar otro vehículo</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Formulario de Vehículo — Flujo Deslizable Paso a Paso */}
                  {(mostrarFormNuevoVehiculo || !clienteSeleccionado?.vehicles?.length) && (() => {
                    const PASOS: Array<{ id: typeof subPasoVehiculo; label: string; icon: string }> = [
                      { id: "placa", label: "Placa", icon: "🔢" },
                      { id: "marca", label: "Marca", icon: "🏷️" },
                      { id: "modelo", label: "Modelo", icon: "🚘" },
                      { id: "anio", label: "Año", icon: "📅" },
                      { id: "tipo", label: "Tipo", icon: "🚗" },
                    ];

                    const pasoIdx = PASOS.findIndex((p) => p.id === subPasoVehiculo);
                    const irASiguiente = async () => {
                      if (subPasoVehiculo === "placa") {
                        const placaLimpia = vehiculoPlaca.trim().toUpperCase();
                        const alnumBuscado = placaLimpia.replace(/[^A-Z0-9]/g, "");
                        if (!placaLimpia || alnumBuscado.length < 3) {
                          mostrarToast("Ingresa la placa del vehículo para continuar", "err");
                          return;
                        }

                        // Verificar si el vehículo ya existe en catálogo local o en Neon
                        let vehiculoExistente: any = null;
                        let duenioVehiculo: any = null;

                        for (const v of clienteSeleccionado?.vehicles || []) {
                          if (String(v.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === alnumBuscado) {
                            vehiculoExistente = v;
                            duenioVehiculo = clienteSeleccionado;
                            break;
                          }
                        }

                        if (!vehiculoExistente) {
                          for (const c of listaClientes || []) {
                            const vMatch = (c.vehicles || []).find(
                              (v: any) => String(v.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === alnumBuscado
                            );
                            if (vMatch) {
                              vehiculoExistente = vMatch;
                              duenioVehiculo = c;
                              break;
                            }
                          }
                        }

                        if (!vehiculoExistente) {
                          try {
                            const res = await fetch(`/api/taller/operacion?query=${encodeURIComponent(placaLimpia)}`);
                            const data = await res.json().catch(() => null);
                            if (data?.success && data?.found) {
                              const vehs = Array.isArray(data.customer?.vehicles)
                                ? data.customer.vehicles
                                : data.vehicle
                                  ? [data.vehicle]
                                  : [];
                              const vExacto =
                                vehs.find(
                                  (v: any) => String(v.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === alnumBuscado
                                ) || data.vehicle;
                              if (vExacto) {
                                vehiculoExistente = vExacto;
                                duenioVehiculo = data.customer || null;
                              }
                            }
                          } catch { }
                        }

                        if (vehiculoExistente) {
                          const placaReal = (vehiculoExistente.plate || placaLimpia).toUpperCase();
                          setVehiculoSeleccionadoId(vehiculoExistente.id || "NUEVO");
                          setVehiculoPlaca(placaReal);
                          setVehiculoMarca(vehiculoExistente.brand || "");
                          setVehiculoModelo(vehiculoExistente.model || "");
                          if (vehiculoExistente.year) setVehiculoAnio(String(vehiculoExistente.year));
                          if (vehiculoExistente.vehicleType) setVehiculoTipo(vehiculoExistente.vehicleType);
                          setVehiculoKm(vehiculoExistente.mileage ? String(vehiculoExistente.mileage) : "");
                          setVehiculoFoto(vehiculoExistente.imageUrl || null);
                          setMostrarFormNuevoVehiculo(false);

                          if (!clienteSeleccionado && duenioVehiculo) {
                            setClienteSeleccionado(duenioVehiculo);
                            setBusquedaCliente(duenioVehiculo.name || "");
                            setNuevoClienteNombre(duenioVehiculo.name || "");
                            setNuevoClienteIdentificacion(duenioVehiculo.identification || "");
                            setNuevoClienteTelefono(duenioVehiculo.phone || "");
                            setNuevoClienteEmail(duenioVehiculo.email || "");
                            setEmailContacto(duenioVehiculo.email || "");
                            setNuevoClienteDireccion(duenioVehiculo.address || "");
                          }

                          mostrarToast(
                            `Vehículo existente detectado (${placaReal}${vehiculoExistente.brand ? ` • ${vehiculoExistente.brand} ${vehiculoExistente.model || ""}` : ""}). Pasando al ingreso.`,
                            "ok"
                          );
                          setPasoActivo(3);
                          return;
                        }

                        setSubPasoVehiculo("marca");
                      } else if (subPasoVehiculo === "marca") {
                        setSubPasoVehiculo("modelo");
                      } else if (subPasoVehiculo === "modelo") {
                        setSubPasoVehiculo("anio");
                      } else if (subPasoVehiculo === "anio") {
                        setSubPasoVehiculo("tipo");
                      } else if (subPasoVehiculo === "tipo") {
                        if (!vehiculoPlaca.trim()) {
                          mostrarToast("Ingresa la placa del vehículo", "err");
                          setSubPasoVehiculo("placa");
                          return;
                        }
                        setPasoActivo(3);
                      }
                    };

                    const irAAnterior = () => {
                      if (pasoIdx > 0) {
                        setSubPasoVehiculo(PASOS[pasoIdx - 1].id);
                      }
                    };

                    const getValorResumen = (id: typeof subPasoVehiculo) => {
                      if (id === "placa") return vehiculoPlaca;
                      if (id === "marca") return vehiculoMarca;
                      if (id === "modelo") return vehiculoModelo;
                      if (id === "anio") return vehiculoAnio;
                      if (id === "tipo") return vehiculoTipo;
                      return "";
                    };

                    return (
                      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-50/90 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-white/10 space-y-5 shadow-xs transition-all">
                        {/* Header: Cliente y botón para volver a lista guardados si tiene */}
                        <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-white/5 pb-3">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Asociado a:</span>
                            <strong className="font-bold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-white/5 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/10">
                              {clienteSeleccionado?.name || nuevoClienteNombre || "Sin cliente"}
                            </strong>
                          </div>
                          {clienteSeleccionado?.vehicles && clienteSeleccionado.vehicles.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setMostrarFormNuevoVehiculo(false)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                            >
                              ← Volver
                            </button>
                          )}
                        </div>

                        {/* Barra de Progreso Deslizable / Breadcrumbs Interactivos */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                          {PASOS.map((p, idx) => {
                            const esActivo = p.id === subPasoVehiculo;
                            const valor = getValorResumen(p.id);
                            const esCompletado = idx < pasoIdx || Boolean(String(valor || "").trim());

                            const colorClase = esActivo
                              ? "bg-blue-600 text-white shadow-sm font-bold scale-[1.02]"
                              : esCompletado
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                                : "bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300";

                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  // Solo permitir ir si la placa ya está ingresada o si se regresa
                                  if (idx === 0 || vehiculoPlaca.trim()) {
                                    setSubPasoVehiculo(p.id);
                                  } else {
                                    mostrarToast("Primero ingresa la placa del vehículo", "err");
                                  }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${colorClase}`}
                              >
                                <span>{p.icon}</span>
                                <span>{p.label}</span>
                                {p.id === "modelo" && vehiculoFoto && (
                                  <img
                                    src={vehiculoFoto}
                                    alt="Foto"
                                    className="w-4 h-4 rounded-full object-cover border border-blue-500 shrink-0 inline-block"
                                  />
                                )}
                                {esCompletado && (
                                  <span className={esActivo ? "text-white font-bold" : "text-blue-600 dark:text-blue-400 font-bold"}>
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Tarjeta del Campo Activo con Animación Deslizable */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 shadow-xs space-y-4 animate-fade-in">

                          {/* ================= PASO 1: PLACA ================= */}
                          {subPasoVehiculo === "placa" && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                                  🔢 Placa del Vehículo <span className="text-rose-500">*</span>
                                </label>
                              </div>

                              <div>
                                <input
                                  type="text"
                                  value={vehiculoPlaca}
                                  onChange={(e) => setVehiculoPlaca(e.target.value.toUpperCase())}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && vehiculoPlaca.trim()) {
                                      e.preventDefault();
                                      setSubPasoVehiculo("marca");
                                    }
                                  }}
                                  placeholder="Ej: ABC-1234"
                                  className="w-full h-16 px-5 rounded-2xl bg-zinc-50 dark:bg-black/50 border-2 border-zinc-300 dark:border-white/15 focus:border-blue-500 text-zinc-900 dark:text-white font-mono font-bold uppercase text-2xl tracking-widest placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none shadow-inner"
                                  autoFocus
                                />
                              </div>

                              <div className="pt-2 relative z-10">
                                <button
                                  type="button"
                                  onClick={irASiguiente}
                                  disabled={!vehiculoPlaca.trim()}
                                  className={`w-full h-12 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 ${vehiculoPlaca.trim()
                                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20"
                                    : "bg-zinc-200 dark:bg-white/5 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                                    }`}
                                >
                                  <span>Siguiente</span>
                                  <span>→</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ================= PASO 2: MARCA ================= */}
                          {subPasoVehiculo === "marca" && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                                  🏷️ Marca del Vehículo
                                </label>
                              </div>

                              <div>
                                <input
                                  type="text"
                                  value={vehiculoMarca}
                                  onChange={(e) => setVehiculoMarca(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      setSubPasoVehiculo("modelo");
                                    }
                                  }}
                                  placeholder="Ej: Toyota, Chevrolet, Hyundai..."
                                  className="w-full h-14 px-4 rounded-2xl bg-zinc-50 dark:bg-black/50 border-2 border-zinc-300 dark:border-white/15 focus:border-blue-500 text-zinc-900 dark:text-white text-lg font-semibold placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none shadow-sm"
                                  autoFocus
                                />
                              </div>

                              {/* Chips de Marcas Populares */}
                              <div className="space-y-1.5">
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                                  Marcas Frecuentes:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {["Toyota", "Chevrolet", "Hyundai", "Kia", "Nissan", "Ford", "Renault", "Volkswagen", "Mazda"].map((m) => (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => {
                                        setVehiculoMarca(m);
                                      }}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${vehiculoMarca.toUpperCase() === m.toUpperCase()
                                        ? "bg-blue-600 text-white font-bold shadow-xs scale-105"
                                        : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10"
                                        }`}
                                    >
                                      {m}
                                      {vehiculoMarca.toUpperCase() === m.toUpperCase() && " ✓"}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Botones de Navegación */}
                              <div className="pt-2 flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={irAAnterior}
                                  className="h-12 px-5 rounded-xl border border-zinc-300 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shrink-0"
                                >
                                  <span>←</span>
                                  <span>Atrás</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={irASiguiente}
                                  className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-98"
                                >
                                  <span>Siguiente</span>
                                  <span>→</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ================= PASO 3: MODELO ================= */}
                          {subPasoVehiculo === "modelo" && (() => {
                            // Modelos sugeridos basados en la marca seleccionada
                            const modelosSugeridos = (() => {
                              if (vehiculoMarca) {
                                const marcaKey = Object.keys(CATALOGO_VEHICULOS).find(
                                  (m) => m.toLowerCase() === vehiculoMarca.trim().toLowerCase()
                                );
                                if (marcaKey && CATALOGO_VEHICULOS[marcaKey]?.modelos?.length > 0) {
                                  return CATALOGO_VEHICULOS[marcaKey].modelos;
                                }
                              }
                              return ["Hilux", "D-Max", "Fortuner", "Sportage", "Tucson", "Aveo", "Sail", "Ranger", "Picanto"];
                            })();

                            return (
                              <div className="space-y-3.5">
                                <div>
                                  <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                                    🚘 Modelo del Vehículo {vehiculoMarca ? `(${vehiculoMarca})` : ""}
                                  </label>
                                </div>


                                <div className="relative z-30">
                                  <input
                                    type="text"
                                    value={vehiculoModelo}
                                    onChange={(e) => setVehiculoModelo(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        setSubPasoVehiculo("anio");
                                      }
                                    }}
                                    placeholder={vehiculoMarca ? `Ej: Modelo de ${vehiculoMarca}` : "Ej: Hilux, Aveo, Tucson..."}
                                    className="w-full h-14 pl-4 pr-16 rounded-2xl bg-zinc-50 dark:bg-black/50 border-2 border-zinc-300 dark:border-white/15 focus:border-blue-500 text-zinc-900 dark:text-white text-lg font-semibold placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none shadow-sm"
                                    autoFocus
                                  />

                                  {/* Botón Tomar Foto de Perfil del Vehículo (Visible con alto contraste en Modo Oscuro) */}
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-40">
                                    {/* Input para Cámara Móvil Directa */}
                                    <input
                                      ref={fileInputVehiculoCamaraRef}
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      className="hidden"
                                      onChange={handleFotoVehiculoSeleccionada}
                                    />
                                    {/* Input para Galería / Archivo */}
                                    <input
                                      ref={fileInputVehiculoGaleriaRef}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={handleFotoVehiculoSeleccionada}
                                    />

                                    <button
                                      type="button"
                                      onClick={() => setMostrarMenuFotoVehiculo((prev) => !prev)}
                                      title="Tomar foto con el móvil o subir de galería"
                                      className="relative w-10 h-10 rounded-xl bg-blue-500/20 hover:bg-blue-500/35 border-2 border-blue-400 dark:border-blue-400 text-blue-300 dark:text-blue-300 flex items-center justify-center cursor-pointer transition-all shadow-md shadow-blue-500/20 active:scale-95 overflow-hidden group"
                                    >
                                      {vehiculoFoto ? (
                                        <div className="relative w-full h-full">
                                          <img
                                            src={vehiculoFoto}
                                            alt="Foto perfil vehículo"
                                            className="w-full h-full object-cover"
                                          />
                                          {subiendoFotoVehiculo && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />
                                            </div>
                                          )}
                                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-[9px] font-bold text-white bg-black/60 px-1 py-0.5 rounded">Cambiar</span>
                                          </div>
                                        </div>
                                      ) : subiendoFotoVehiculo ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent" />
                                      ) : (
                                        <svg className="w-5 h-5 text-blue-400 dark:text-blue-300 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                          <circle cx="12" cy="13" r="3" />
                                        </svg>
                                      )}
                                    </button>

                                    {vehiculoFoto && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setVehiculoFoto(null);
                                        }}
                                        title="Quitar foto"
                                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center shadow cursor-pointer transition-transform hover:scale-110 z-10"
                                      >
                                        ✕
                                      </button>
                                    )}

                                    {/* Menú Flotante: Tomar con Cámara Móvil o Subir de Galería */}
                                    {mostrarMenuFotoVehiculo && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-[90]"
                                          onClick={() => setMostrarMenuFotoVehiculo(false)}
                                        />
                                        <div className="absolute right-0 top-full mt-2 w-36 sm:w-40 p-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-900/10 dark:shadow-black/70 z-[100] animate-in fade-in zoom-in-95">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setMostrarMenuFotoVehiculo(false);
                                              fileInputVehiculoCamaraRef.current?.click();
                                            }}
                                            className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/20 dark:hover:text-blue-300 flex items-center gap-2 cursor-pointer transition-colors"
                                          >
                                            <span className="text-base">📸</span>
                                            <span>Cámara</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setMostrarMenuFotoVehiculo(false);
                                              fileInputVehiculoGaleriaRef.current?.click();
                                            }}
                                            className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/20 dark:hover:text-blue-300 flex items-center gap-2 cursor-pointer transition-colors"
                                          >
                                            <span className="text-base">🖼️</span>
                                            <span>Galería</span>
                                          </button>
                                          {vehiculoFoto && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setMostrarMenuFotoVehiculo(false);
                                                setVehiculoFoto(null);
                                              }}
                                              className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 flex items-center gap-2 cursor-pointer transition-colors border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-1"
                                            >
                                              <span className="text-base">🗑️</span>
                                              <span>Quitar</span>
                                            </button>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Chips de Modelos Frecuentes / Filtrados por Marca */}
                                <div className="space-y-1.5">
                                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                                    {vehiculoMarca ? `Modelos de ${vehiculoMarca}:` : "Modelos Comunes:"}
                                  </span>
                                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                                    {modelosSugeridos.map((mod) => (
                                      <button
                                        key={mod}
                                        type="button"
                                        onClick={() => {
                                          // Al aplicar filtro solo selecciona el modelo sin salir al paso año
                                          setVehiculoModelo(mod);
                                          const tipoDetectado = detectarCarroceria(mod, vehiculoMarca);
                                          if (tipoDetectado) {
                                            setVehiculoTipo(tipoDetectado);
                                          }
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${vehiculoModelo.toUpperCase() === mod.toUpperCase()
                                          ? "bg-blue-600 text-white font-bold shadow-xs scale-105"
                                          : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10"
                                          }`}
                                      >
                                        {mod}
                                        {vehiculoModelo.toUpperCase() === mod.toUpperCase() && " ✓"}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Botones de Navegación — Cambia de paso únicamente al presionar Avanzar a Año */}
                                <div className="pt-2 flex items-center gap-2.5">
                                  <button
                                    type="button"
                                    onClick={irAAnterior}
                                    className="h-12 px-5 rounded-xl border border-zinc-300 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shrink-0"
                                  >
                                    <span>←</span>
                                    <span>Atrás</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={irASiguiente}
                                    className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-98"
                                  >
                                    <span>Siguiente</span>
                                    <span>→</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* ================= PASO 4: AÑO ================= */}
                          {subPasoVehiculo === "anio" && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                                  📅 Año de Fabricación
                                </label>
                              </div>


                              <div className="relative">
                                <input
                                  type="text"
                                  value={vehiculoAnio}
                                  onChange={(e) => setVehiculoAnio(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      setSubPasoVehiculo("tipo");
                                    }
                                  }}
                                  placeholder="Ej: 2024"
                                  maxLength={4}
                                  className="w-full h-14 px-5 rounded-2xl bg-zinc-50 dark:bg-black/50 border-2 border-zinc-300 dark:border-white/15 focus:border-blue-500 text-zinc-900 dark:text-white font-mono text-xl font-bold placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none shadow-sm"
                                  autoFocus
                                />
                              </div>

                              {/* Chips de Años Recientes */}
                              <div className="space-y-1.5">
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                                  Años Recientes:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {[2025, 2024, 2023, 2022, 2021, 2020, 2018, 2015, 2010].map((yr) => (
                                    <button
                                      key={yr}
                                      type="button"
                                      onClick={() => {
                                        setVehiculoAnio(String(yr));
                                      }}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${vehiculoAnio === String(yr)
                                        ? "bg-blue-600 text-white font-bold shadow-xs scale-105"
                                        : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10"
                                        }`}
                                    >
                                      {yr}
                                      {vehiculoAnio === String(yr) && " ✓"}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Botones de Navegación */}
                              <div className="pt-2 flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={irAAnterior}
                                  className="h-12 px-5 rounded-xl border border-zinc-300 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shrink-0"
                                >
                                  <span>←</span>
                                  <span>Atrás</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={irASiguiente}
                                  className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-98"
                                >
                                  <span>Siguiente</span>
                                  <span>→</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ================= PASO 5: TIPO DE VEHÍCULO ================= */}
                          {subPasoVehiculo === "tipo" && (
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                                  Tipo de Carrocería
                                </label>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {[
                                  {
                                    v: "Auto",
                                    label: "Auto / Sedán",
                                    icon: (
                                      <svg viewBox="0 0 64 36" fill="none" className="w-12 h-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 24h6m12 0h16m12 0h6a3 3 0 0 0 3-3c0-3-2-5-5-5l-5-1-6-7a4 4 0 0 0-3-1.5H23a4 4 0 0 0-3.2 1.6L14 15l-8 2c-2 0.5-3 2-3 4a3 3 0 0 0 3 3z" />
                                        <path d="M20 10.5h18.5a2 2 0 0 1 1.6 0.8l4.4 5.7H20V10.5z" fill="currentColor" fillOpacity="0.16" />
                                        <path d="M15.5 17l3.5-5.5V17h-3.5z" fill="currentColor" fillOpacity="0.16" />
                                        <circle cx="18" cy="24" r="5" fill="currentColor" fillOpacity="0.15" />
                                        <circle cx="18" cy="24" r="2.2" fill="currentColor" />
                                        <circle cx="46" cy="24" r="5" fill="currentColor" fillOpacity="0.15" />
                                        <circle cx="46" cy="24" r="2.2" fill="currentColor" />
                                      </svg>
                                    ),
                                  },
                                  {
                                    v: "SUV",
                                    label: "SUV",
                                    icon: (
                                      <svg viewBox="0 0 64 36" fill="none" className="w-12 h-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="5" x2="40" y2="5" strokeWidth="2" />
                                        <line x1="25" y1="5" x2="25" y2="7" strokeWidth="1.8" />
                                        <line x1="37" y1="5" x2="37" y2="7" strokeWidth="1.8" />
                                        <path d="M6 25h6m12 0h16m12 0h6a3 3 0 0 0 3-3c0-3.5-2.5-5.5-5-5.5h-2l-3-8a3 3 0 0 0-2.8-2H21a3 3 0 0 0-2.6 1.5L13 16l-7 1.5c-2 0.5-3 2-3 4a3.5 3.5 0 0 0 3 3.5z" />
                                        <path d="M19.5 8h20a1.5 1.5 0 0 1 1.4 1l2.5 7.5H15.5L19.5 8z" fill="currentColor" fillOpacity="0.16" />
                                        <line x1="30" y1="8" x2="30" y2="16.5" />
                                        <circle cx="18" cy="25" r="5.5" fill="currentColor" fillOpacity="0.15" />
                                        <circle cx="18" cy="25" r="2.2" fill="currentColor" />
                                        <circle cx="46" cy="25" r="5.5" fill="currentColor" fillOpacity="0.15" />
                                        <circle cx="46" cy="25" r="2.2" fill="currentColor" />
                                      </svg>
                                    ),
                                  },
                                  {
                                    v: "Camioneta",
                                    label: "Camioneta",
                                    icon: (
                                      <svg viewBox="0 0 64 36" fill="none" className="w-12 h-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 25h6m12 0h16m12 0h6a3 3 0 0 0 3-3v-5a1.5 1.5 0 0 0-1.5-1.5H41V10a3 3 0 0 0-2.8-2.5H23a3 3 0 0 0-2.6 1.5L14 16l-8 1.5c-2 0.5-3 2-3 4a3.5 3.5 0 0 0 3 3.5z" />
                                        <path d="M21 9h17a1.5 1.5 0 0 1 1.5 1.5V15.5H16L21 9z" fill="currentColor" fillOpacity="0.16" />
                                        <line x1="41" y1="15.5" x2="58" y2="15.5" strokeWidth="2" />
                                        <circle cx="18" cy="25" r="5.5" fill="currentColor" fillOpacity="0.15" />
                                        <circle cx="18" cy="25" r="2.2" fill="currentColor" />
                                        <circle cx="46" cy="25" r="5.5" fill="currentColor" fillOpacity="0.15" />
                                        <circle cx="46" cy="25" r="2.2" fill="currentColor" />
                                      </svg>
                                    ),
                                  },
                                  {
                                    v: "Moto",
                                    label: "Moto",
                                    icon: (
                                      <svg viewBox="0 0 64 36" fill="none" className="w-12 h-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="14" cy="23" r="6" fill="currentColor" fillOpacity="0.15" />
                                        <circle cx="14" cy="23" r="2" fill="currentColor" />
                                        <circle cx="49" cy="23" r="6" fill="currentColor" fillOpacity="0.15" />
                                        <circle cx="49" cy="23" r="2" fill="currentColor" />
                                        <line x1="49" y1="23" x2="42" y2="8" />
                                        <line x1="39" y1="8" x2="45" y2="8" strokeWidth="2.6" />
                                        <path d="M14 23l12-3 6-7h8l-3 10-10 1" />
                                        <path d="M28 13c3-3 7-3 10 0l-3 4h-7z" fill="currentColor" fillOpacity="0.16" />
                                        <path d="M19 14h7l2 4" strokeWidth="2" />
                                        <line x1="14" y1="23" x2="28" y2="20" />
                                      </svg>
                                    ),
                                  },
                                  {
                                    v: "Camión",
                                    label: "Camión / Pesado",
                                    icon: (
                                      <svg viewBox="0 0 64 36" fill="none" className="w-12 h-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="5" y="7" width="31" height="18" rx="2" fill="currentColor" fillOpacity="0.16" />
                                        <path d="M36 12h13a2 2 0 0 1 1.7 1l4.8 7.5a2 2 0 0 1 0.5 1.2V25h-5m-15 0h-6m-13 0H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h31" />
                                        <path d="M38 14h9l3.5 5.5H38V14z" fill="currentColor" fillOpacity="0.25" />
                                        <circle cx="16" cy="25" r="5" fill="currentColor" fillOpacity="0.15" />
                                        <circle cx="16" cy="25" r="2.2" fill="currentColor" />
                                        <circle cx="45" cy="25" r="5" fill="currentColor" fillOpacity="0.15" />
                                        <circle cx="45" cy="25" r="2.2" fill="currentColor" />
                                      </svg>
                                    ),
                                  },
                                ].map(({ v, label, icon }) => {
                                  const esSeleccionado = vehiculoTipo === v;
                                  return (
                                    <button
                                      key={v}
                                      type="button"
                                      onClick={() => {
                                        setVehiculoTipo(v);
                                      }}
                                      className={`p-3.5 sm:p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer group active:scale-95 ${esSeleccionado
                                        ? "bg-blue-500/15 border-blue-500 text-blue-800 dark:text-blue-300 shadow-sm font-bold"
                                        : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-blue-500/50"
                                        }`}
                                    >
                                      <div
                                        className={`transition-transform duration-200 group-hover:scale-110 ${esSeleccionado
                                          ? "text-blue-600 dark:text-blue-400"
                                          : "text-zinc-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                                          }`}
                                      >
                                        {icon}
                                      </div>
                                      <span className="text-xs font-bold text-center leading-tight">{label}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Botón de Confirmación Final */}
                              <div className="pt-2 flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={irAAnterior}
                                  className="h-12 px-5 rounded-xl border border-zinc-300 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shrink-0"
                                >
                                  <span>←</span>
                                  <span>Atrás</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={irASiguiente}
                                  className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 active:scale-98"
                                >
                                  <span>Continuar</span>
                                  <span>→</span>
                                </button>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })()}

                </div>
              )}

              {/* =================================================================
              PASO 3: INGRESO (TIPO DE SERVICIO, RECEPCIÓN Y MOTIVO DE INGRESO)
              ================================================================= */}
              {pasoActivo === 3 && (
                <div className="space-y-5 animate-fade-in">

                  {/* Grid Principal de Ingreso: Combustible, Kilometraje, Inventario y Fotos Iniciales */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Columna Izquierda: Combustible + Kilometraje + Inventario */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Card 1: Combustible */}
                      <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm">
                              ⛽
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 block">Nivel de Combustible</span>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                            {nivelCombustible} • {porcentajeCombustible}%
                          </span>
                        </div>

                        {/* Botones de Selección Rápida (Conservados intactos) */}
                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                          {(["E", "1/4", "1/2", "3/4", "F"] as const).map((lvl) => {
                            const sel = nivelCombustible === lvl;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => handleBotonCombustible(lvl)}
                                className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${sel
                                  ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-500/10"
                                  : "bg-white dark:bg-white/[0.02] hover:bg-zinc-100 dark:hover:bg-white/[0.06] border border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-400"
                                  }`}
                              >
                                {lvl}
                              </button>
                            );
                          })}
                        </div>

                        {/* Barra manual deslizable interactiva para medir gasolina */}
                        <div className="space-y-1.5 pt-1">
                          <div className="relative flex items-center h-7">
                            {/* Pista de fondo con marcas */}
                            <div className="w-full h-4 rounded-full bg-zinc-200 dark:bg-black/50 border border-zinc-300 dark:border-white/10 relative overflow-hidden shadow-inner">
                              {/* Relleno con gradiente dinámico */}
                              <div
                                className={`h-full transition-all duration-100 rounded-full ${porcentajeCombustible <= 15
                                  ? "bg-gradient-to-r from-rose-500 to-amber-500"
                                  : porcentajeCombustible <= 40
                                    ? "bg-gradient-to-r from-amber-500 to-emerald-400"
                                    : "bg-gradient-to-r from-emerald-500 to-teal-400"
                                  }`}
                                style={{ width: `${Math.max(porcentajeCombustible, 2)}%` }}
                              />

                              {/* Marcas de referencia (25%, 50%, 75%) */}
                              <div className="absolute inset-0 flex justify-between px-[25%] pointer-events-none opacity-30">
                                <span className="w-px h-full bg-zinc-500 dark:bg-white/40" />
                                <span className="w-px h-full bg-zinc-500 dark:bg-white/40" />
                              </div>
                            </div>

                            {/* Input Range táctil/mouse para deslizar con dedo en móvil */}
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={porcentajeCombustible}
                              onChange={(e) => handleSliderCombustible(Number(e.target.value))}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20 touch-none"
                              title="Arrastra para ajustar el nivel de combustible manualmente"
                            />

                            {/* Aguja / Perilla visual del slider */}
                            <div
                              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white dark:bg-zinc-800 border-2 border-emerald-500 shadow-md flex items-center justify-center pointer-events-none transition-all duration-75 z-10"
                              style={{ left: `${porcentajeCombustible}%` }}
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            </div>
                          </div>

                          {/* Leyenda inferior */}
                          <div className="flex justify-between items-center px-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                            <span>E (Vacío)</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-mono font-extrabold">{porcentajeCombustible}%</span>
                            <span>F (Lleno)</span>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Kilometraje (Sección separada, minimalista y moderna) */}
                      <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3 transition-all hover:border-zinc-300 dark:hover:border-white/15 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
                              </svg>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 block">Kilometraje</span>
                            </div>
                          </div>
                          {vehiculoKm && (
                            <span className="text-xs font-mono font-bold text-sky-700 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                              {Number(vehiculoKm).toLocaleString()} KM
                            </span>
                          )}
                        </div>

                        <div className="relative flex items-center rounded-xl bg-white dark:bg-black/40 border border-zinc-300 dark:border-white/10 focus-within:border-sky-500/60 focus-within:ring-2 focus-within:ring-sky-500/15 transition-all shadow-xs">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={vehiculoKm}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              setVehiculoKm(val);
                            }}
                            placeholder="Ej: 85400"
                            className="w-full h-11 pl-4 pr-16 bg-transparent text-zinc-900 dark:text-white font-mono text-base font-semibold tracking-wider placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none"
                          />
                          <div className="absolute right-2.5 flex items-center gap-1.5">
                            {vehiculoKm && (
                              <button
                                type="button"
                                onClick={() => setVehiculoKm("")}
                                className="w-5 h-5 rounded-md bg-zinc-200/60 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center text-[10px] transition-colors cursor-pointer"
                                title="Limpiar"
                              >
                                ✕
                              </button>
                            )}
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5 px-2 py-1 rounded-md border border-zinc-200 dark:border-white/10 pointer-events-none">
                              KM
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Inventario (Sección separada) */}
                      <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3 transition-all hover:border-zinc-300 dark:hover:border-white/15 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                              </svg>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 block">Inventario de Recepción</span>
                            </div>
                          </div>
                          <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono px-2 py-0.5 rounded-full bg-zinc-200/50 dark:bg-white/5 border border-zinc-200 dark:border-white/5">
                            {inventarioTrae.length} ítems
                          </span>
                        </div>

                        {/* Tags con una sola palabra */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {listaItemsInventario.map((item) => {
                            const sel = inventarioTrae.includes(item);
                            const esManual = ![
                              "Gata",
                              "Llave",
                              "Triángulos",
                              "Botiquín",
                              "Extintor",
                              "Repuesto",
                              "Matrícula",
                              "Herramientas",
                              "Antena",
                              "Documentos",
                            ].includes(item);
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => toggleInventario(item)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${sel
                                  ? "bg-blue-600/15 border border-blue-500/40 text-blue-700 dark:text-blue-300 shadow-xs"
                                  : "bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.05]"
                                  }`}
                              >
                                <span>{sel ? "✓" : "+"}</span>
                                <span>{item}</span>
                                {esManual && (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInventarioTrae((prev) => prev.filter((i) => i !== item));
                                      setListaItemsInventario((prev) => prev.filter((i) => i !== item));
                                    }}
                                    className="text-zinc-500 hover:text-red-500 ml-0.5 text-[10px]"
                                    title="Quitar ítem"
                                  >
                                    ✕
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Campo para ingresar ítems manualmente */}
                        <div className="flex items-center gap-2 pt-1.5">
                          <input
                            type="text"
                            value={itemManualInventario}
                            onChange={(e) => setItemManualInventario(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                agregarItemManual();
                              }
                            }}
                            placeholder="Nuevo ítem..."
                            className="h-9 flex-1 px-3 rounded-xl bg-white dark:bg-black/40 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white text-xs placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={agregarItemManual}
                            disabled={!itemManualInventario.trim()}
                            className="h-9 px-3.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/40 text-blue-700 dark:text-blue-300 disabled:opacity-40 text-xs font-semibold transition-all cursor-pointer active:scale-95"
                          >
                            + Agregar
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Columna Derecha: Fotos del Vehículo */}
                    <div className="lg:col-span-5 p-4 rounded-2xl bg-zinc-50/70 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3 flex flex-col justify-between transition-all hover:border-zinc-300 dark:hover:border-white/15 shadow-xs">
                      <div className="space-y-3">
                        {/* Cabecera de la sección de fotos */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                              </svg>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 block">Fotos del Vehículo</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-200/50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 px-2 py-0.5 rounded-full">
                              {fotosIniciales.length} {fotosIniciales.length === 1 ? "foto" : "fotos"}
                            </span>
                          </div>
                        </div>

                        {/* Estados de carga / subida con barra de progreso real */}
                        {(subiendoFoto || subiendoVideo || subiendoAudio) && (
                          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs space-y-1.5 animate-fade-in">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1.5 truncate">
                                <span className="w-2.5 h-2.5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                                <span className="truncate">{progresoSubida?.status || "Guardando en Cloudflare R2..."}</span>
                              </span>
                              <span className="font-mono font-bold shrink-0">{progresoSubida?.percent || 60}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-black/40 overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                                style={{ width: `${progresoSubida?.percent || 60}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* PANEL DE FOTOS SIEMPRE VISIBLE EN INGRESO */}
                        <div className="p-3 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 space-y-2.5 animate-fade-in shadow-xs">
                          <div className="flex items-center justify-between text-xs pb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-900 dark:text-zinc-200 font-semibold">Fotos</span>
                              <span className="text-[10px] text-zinc-600 dark:text-zinc-500 font-medium">
                                ({fotosIniciales.length}/{MULTIMEDIA_CONFIG.MAX_PHOTOS})
                              </span>
                            </div>
                          </div>

                          {camaraFotoActiva ? (
                            <div className="space-y-2">
                              <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-sky-500/40 shadow-inner">
                                <video
                                  ref={camaraFotoVideoRef}
                                  autoPlay
                                  playsInline
                                  muted
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/70 border border-sky-500/40 text-sky-300 text-[10px] font-mono">
                                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                                  <span>Cámara en vivo</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <button
                                  type="button"
                                  onClick={detenerCamaraFoto}
                                  disabled={subiendoFoto}
                                  className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs cursor-pointer font-medium"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={capturarFotoDesdeCamara}
                                  disabled={subiendoFoto}
                                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md shadow-sky-600/30 disabled:opacity-50"
                                >
                                  <span>📸</span>
                                  <span>Capturar foto</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {fotosIniciales.length < MULTIMEDIA_CONFIG.MAX_PHOTOS ? (
                                <>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={iniciarCamaraFoto}
                                      disabled={subiendoFoto}
                                      className="p-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-700 dark:text-sky-200 text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <svg
                                        className="w-5 h-5 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.75}
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                                        />
                                        <circle cx="12" cy="13" r="3" />
                                      </svg>
                                      <span>Cámara</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => fileInputFotosRef.current?.click()}
                                      disabled={subiendoFoto}
                                      className="p-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <svg
                                        className="w-5 h-5 text-zinc-500 dark:text-zinc-400 group-hover:scale-110 transition-transform"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.75}
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                                        />
                                      </svg>
                                      <span>Galería</span>
                                    </button>
                                  </div>

                                  <p className="text-[10px] text-zinc-600 dark:text-zinc-500 text-center font-medium">
                                    Compresión
                                  </p>

                                  <input
                                    ref={fileInputFotosRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleSubirFotosIniciales}
                                    className="hidden"
                                  />
                                </>
                              ) : (
                                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
                                  <span>Límite de {MULTIMEDIA_CONFIG.MAX_PHOTOS} fotos alcanzado</span>
                                  <span className="font-mono font-bold">5/5</span>
                                </div>
                              )}

                              {fotosIniciales.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                  {fotosIniciales.map((url, i) => (
                                    <div
                                      key={url + "_" + i}
                                      className="relative aspect-[4/3] overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-black/40 shadow-xs cursor-pointer"
                                      onClick={() => setFotoEnZoom(url)}
                                      title="Clic para ampliar detalle"
                                    >
                                      <img
                                        src={url}
                                        alt={`Foto ${i + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                      {subiendoFoto ? (
                                        <span className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/70 text-white text-[10px] flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                                          Subiendo...
                                        </span>
                                      ) : (
                                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-emerald-600/80 text-white text-[9px] font-semibold">
                                          ✓ Lista
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleEliminarFoto(i);
                                        }}
                                        title="Eliminar foto"
                                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center text-xs font-bold border border-white/20 transition-all cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* PANEL CONTEXTUAL 2: VIDEO */}
                        {panelMultimedia === "video" && (
                          <div className="p-3 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 space-y-2.5 animate-fade-in shadow-xs">
                            <div className="flex items-center justify-between text-xs pb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-900 dark:text-zinc-200 font-semibold">Video de ingreso</span>
                                <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                                  (720p • Máx. {MULTIMEDIA_CONFIG.MAX_VIDEO_DURATION_SECONDS}s)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={cancelarVideoTemp}
                                className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>

                            {grabandoVideo ? (
                              <div className="space-y-2">
                                <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-amber-500/40 shadow-inner">
                                  <video
                                    ref={videoElementRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 border border-red-500/40 text-red-400 text-[11px] font-mono font-bold">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                                    <span>
                                      REC {segundosVideo < 10 ? `00:0${segundosVideo}` : `00:${segundosVideo}`} / 00:
                                      {MULTIMEDIA_CONFIG.MAX_VIDEO_DURATION_SECONDS}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <button
                                    type="button"
                                    onClick={cancelarVideoTemp}
                                    className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs cursor-pointer font-medium"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={detenerGrabacionVideo}
                                    className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md shadow-red-600/30"
                                  >
                                    <span>■ Finalizar clip</span>
                                  </button>
                                </div>
                              </div>
                            ) : videoUrlTemp ? (
                              /* Vista previa antes de guardar con las 3 acciones: Grabar de nuevo, Cancelar y Guardar */
                              <div className="space-y-2.5 animate-fade-in">
                                <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-white/20 shadow-lg">
                                  <video
                                    src={videoUrlTemp}
                                    controls
                                    playsInline
                                    className="w-full h-full object-contain"
                                  />
                                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/80 border border-white/15 text-white text-[11px] font-mono">
                                    Clip grabado: {duracionVideoTemp} seg
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1 gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={descartarYGrabarDeNuevo}
                                      disabled={subiendoVideo}
                                      className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1 font-medium"
                                    >
                                      <span>🔄</span>
                                      <span>Grabar de nuevo</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelarVideoTemp}
                                      disabled={subiendoVideo}
                                      className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs cursor-pointer font-medium"
                                    >
                                      Cancelar
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={guardarVideoConfirmado}
                                    disabled={subiendoVideo}
                                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    <span>✓</span>
                                    <span>Guardar</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={iniciarGrabacionVideo}
                                    className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-200 text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 group"
                                  >
                                    <span className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50 group-hover:scale-110 transition-transform" />
                                    <span>Grabar video</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => fileInputVideoRef.current?.click()}
                                    className="p-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 group"
                                  >
                                    <svg
                                      className="w-5 h-5 text-zinc-500 dark:text-zinc-400 group-hover:scale-110 transition-transform"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      strokeWidth={1.75}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                                      />
                                    </svg>
                                    <span>Adjuntar video</span>
                                  </button>
                                </div>
                                <input
                                  ref={fileInputVideoRef}
                                  type="file"
                                  accept="video/mp4,video/webm,video/quicktime"
                                  onChange={handleSubirArchivoVideo}
                                  className="hidden"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* PANEL CONTEXTUAL 3: NOTA DE VOZ (Deshabilitado: solo fotos) */}
                        {false && (
                          <div className="p-3.5 rounded-2xl bg-white dark:bg-black/50 border border-emerald-500/30 space-y-3 animate-fade-in shadow-xl">
                            <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-200 dark:border-white/10">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-zinc-900 dark:text-zinc-100 font-semibold">Nota de voz</span>
                                <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono font-medium">
                                  (Máx {MULTIMEDIA_CONFIG.MAX_AUDIO_DURATION_SECONDS}s)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={descartarNotaVozTemp}
                                className="w-6 h-6 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs flex items-center justify-center cursor-pointer transition-colors"
                                title="Cerrar panel"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Aviso si el navegador no tiene permisos de micrófono */}
                            {audioPermisoError && (
                              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-2">
                                <div className="flex items-start gap-2">
                                  <span className="text-base shrink-0">⚠️</span>
                                  <p className="leading-relaxed">{audioPermisoError}</p>
                                </div>
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={iniciarGrabacionAudio}
                                    className="px-3 py-1 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-rose-900 dark:text-white font-semibold text-[11px] cursor-pointer"
                                  >
                                    Reintentar acceso
                                  </button>
                                </div>
                              </div>
                            )}

                            {grabandoAudio ? (
                              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                                {/* Indicador de grabación y duración */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                                    <span>Grabando audio...</span>
                                  </div>
                                  <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                    00:{segundosAudio < 10 ? `0${segundosAudio}` : segundosAudio} / 01:00
                                  </span>
                                </div>

                                {/* Barra de progreso de tiempo restante (máx 60s) */}
                                <div className="w-full h-1.5 bg-zinc-200 dark:bg-black/40 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-300 rounded-full"
                                    style={{
                                      width: `${Math.min(100, (segundosAudio / MULTIMEDIA_CONFIG.MAX_AUDIO_DURATION_SECONDS) * 100)}%`,
                                    }}
                                  />
                                </div>

                                {/* Vista previa de transcripción en vivo */}
                                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-black/60 border border-zinc-200 dark:border-white/5 space-y-1">
                                  <span className="text-[10px] text-zinc-600 dark:text-zinc-400 uppercase tracking-wider font-semibold block">
                                    Transcripción en tiempo real:
                                  </span>
                                  {transcripcionVoz ? (
                                    <p className="text-xs text-zinc-800 dark:text-zinc-200 italic leading-relaxed">
                                      "{transcripcionVoz}"
                                    </p>
                                  ) : (
                                    <p className="text-[11px] text-zinc-500 italic">
                                      Habla al micrófono para registrar el dictado...
                                    </p>
                                  )}
                                </div>

                                {/* Botón Detener */}
                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={detenerGrabacionAudio}
                                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-red-600/30 active:scale-95"
                                  >
                                    <span>■</span>
                                    <span>Detener grabación</span>
                                  </button>
                                </div>
                              </div>
                            ) : audioUrlTemp ? (
                              /* Estado con audio listo: Reproductor, Transcripción editable, Volver a grabar, Cancelar y Guardar */
                              <div className="space-y-3 p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10">
                                {/* Reproductor de audio original */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-zinc-800 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
                                      <span>🔊</span>
                                      <span>Audio capturado ({segundosAudio}s)</span>
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                      {audioBlobTemp?.type || "audio/webm"}
                                    </span>
                                  </div>
                                  <audio
                                    src={audioUrlTemp || undefined}
                                    controls
                                    className="w-full h-9 rounded-lg"
                                    preload="metadata"
                                  />
                                </div>

                                {/* Estado de Transcripción */}
                                <div className="flex items-center justify-between pt-1">
                                  <label className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-300 block">
                                    Transcripción de la nota:
                                  </label>
                                  <div className="text-[10px] font-mono px-2 py-0.5 rounded-full border">
                                    {estadoTranscripcion === "lista" && (
                                      <span className="text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                                        ✓ Transcripción lista
                                      </span>
                                    )}
                                    {estadoTranscripcion === "pendiente" && (
                                      <span className="text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
                                        ⏳ Procesando...
                                      </span>
                                    )}
                                    {estadoTranscripcion === "error" && (
                                      <span className="text-rose-700 dark:text-rose-400 border-rose-500/30 bg-rose-500/10">
                                        ⚠️ Error al transcribir
                                      </span>
                                    )}
                                    {estadoTranscripcion === "no_disponible" && (
                                      <span className="text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/5">
                                        ✏️ Entrada manual
                                      </span>
                                    )}
                                    {transcripcionVoz !== transcripcionOriginal &&
                                      transcripcionOriginal.length > 0 && (
                                        <span className="text-sky-700 dark:text-sky-300 border-sky-500/30 bg-sky-500/10 ml-1">
                                          ✎ Modificado
                                        </span>
                                      )}
                                  </div>
                                </div>

                                {/* Campo editable con la transcripción */}
                                <textarea
                                  rows={3}
                                  value={transcripcionVoz}
                                  onChange={(e) => {
                                    const nuevoTexto = e.target.value;
                                    setTranscripcionVoz(nuevoTexto);
                                    transcripcionVozRef.current = nuevoTexto;
                                    const previoAgregado = transcripcionUltimaAgregadaRef.current;
                                    if (previoAgregado && previoAgregado !== nuevoTexto.trim()) {
                                      setMotivoIngreso((prev) => {
                                        if (prev.includes(previoAgregado)) {
                                          return prev.replace(previoAgregado, nuevoTexto.trim());
                                        }
                                        return prev;
                                      });
                                      transcripcionUltimaAgregadaRef.current = nuevoTexto.trim();
                                    }
                                  }}
                                  placeholder="Escribe o corrige lo expresado por el cliente o técnico..."
                                  className="w-full p-2.5 rounded-xl bg-white dark:bg-black/50 border border-zinc-300 dark:border-white/15 focus:border-emerald-500 text-zinc-900 dark:text-white text-xs placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed transition-all shadow-xs"
                                />

                                {/* Alerta si falló la subida para permitir reintento sin perder el audio grabado */}
                                {errorSubidaAudio && (
                                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
                                    <span className="truncate">⚠️ {errorSubidaAudio}</span>
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 shrink-0">
                                      El audio sigue en memoria
                                    </span>
                                  </div>
                                )}

                                {/* Botones: Volver a grabar, Cancelar y Guardar (con reintento si falló) */}
                                <div className="flex items-center justify-between pt-1 gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={descartarYGrabarVoz}
                                      disabled={subiendoAudio}
                                      className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50 font-medium"
                                      title="Descartar y comenzar una nueva grabación"
                                    >
                                      <span>🔄</span>
                                      <span>Volver a grabar</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={descartarNotaVozTemp}
                                      disabled={subiendoAudio}
                                      className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs cursor-pointer disabled:opacity-50 font-medium"
                                    >
                                      Cancelar
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={guardarNotaVoz}
                                    disabled={subiendoAudio}
                                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    {subiendoAudio ? (
                                      <>
                                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Guardando en R2...</span>
                                      </>
                                    ) : errorSubidaAudio ? (
                                      <>
                                        <span>↻</span>
                                        <span>Reintentar guardar</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>✓</span>
                                        <span>Guardar nota</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Estado inicial: Botón Grabar con límite configurable de 60s */
                              <div className="space-y-2 py-2">
                                <button
                                  type="button"
                                  onClick={iniciarGrabacionAudio}
                                  className="w-full py-3 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-200 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 group shadow-xs"
                                >
                                  <span className="w-3 h-3 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform" />
                                  <span>Grabar nota de voz (Micrófono)</span>
                                </button>
                                <p className="text-[10px] text-zinc-600 dark:text-zinc-500 text-center font-medium">
                                  Máx. 60s con transcripción automática
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Galería de Evidencias Capturadas (Fotos, Videos, Notas de Voz) */}
                      <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-white/5">
                        {fotosIniciales.length === 0 && videosIniciales.length === 0 && notasVozIniciales.length === 0 ? (
                          null
                        ) : (
                          <div className="space-y-2">
                            {/* Chips de Videos y Notas de Voz */}
                            <div className="space-y-1.5">
                              {videosIniciales.map((vid, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="text-sm">📹</span>
                                    <span className="text-amber-800 dark:text-amber-200 font-semibold truncate">
                                      {vid.nombre || `Clip de video ${idx + 1}`}
                                    </span>
                                    {vid.duracion && (
                                      <span className="text-[10px] font-mono text-amber-800 dark:text-amber-400/80 bg-amber-500/20 px-1.5 py-0.5 rounded font-bold">
                                        {vid.duracion}s
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarVideo(idx)}
                                    className="w-5 h-5 rounded-full bg-zinc-200/60 dark:bg-white/5 hover:bg-red-500/30 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-300 text-[10px] flex items-center justify-center cursor-pointer ml-2"
                                    title="Eliminar clip"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}

                              {notasVozIniciales.map((audio, idx) => (
                                <div
                                  key={audio.id || idx}
                                  className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-2 shadow-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm">🎙️</span>
                                      <span className="text-emerald-800 dark:text-emerald-200 font-bold">
                                        Nota de voz #{idx + 1}
                                      </span>
                                      <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                        {audio.durationSeconds}s
                                      </span>
                                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                                        por {audio.author || "Técnico"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                                        {audio.transcriptionStatus === "corregida"
                                          ? "Corregida"
                                          : audio.transcriptionStatus === "lista"
                                            ? "Lista"
                                            : audio.transcriptionStatus === "manual"
                                              ? "Manual"
                                              : "Voz"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleEliminarAudio(idx)}
                                        className="w-5 h-5 rounded-full bg-zinc-200/60 dark:bg-white/5 hover:bg-red-500/30 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-300 text-[10px] flex items-center justify-center cursor-pointer transition-colors"
                                        title="Eliminar nota"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>

                                  {/* Reproductor de audio */}
                                  {audio.audioUrl && (
                                    <audio
                                      src={audio.audioUrl}
                                      controls
                                      className="w-full h-7 rounded"
                                      preload="none"
                                    />
                                  )}

                                  {/* Texto transcrito o manual */}
                                  {audio.text ? (
                                    <div className="p-2 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/5">
                                      <p className="text-[11px] text-zinc-800 dark:text-zinc-200 italic leading-relaxed">
                                        "{audio.text}"
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-zinc-500 italic pl-1">
                                      (Audio sin transcripción de texto)
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Modal Lightbox para visualización de foto ampliada */}
                        {fotoEnZoom && (
                          <div
                            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in"
                            onClick={() => setFotoEnZoom(null)}
                          >
                            <div
                              className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="w-full flex justify-between items-center pb-2 text-white text-xs">
                                <span className="font-semibold text-zinc-200">
                                  Detalle fotográfico de recepción (inspección de daños)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setFotoEnZoom(null)}
                                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer transition-colors"
                                >
                                  Cerrar ✕
                                </button>
                              </div>
                              <img
                                src={fotoEnZoom}
                                alt="Evidencia ampliada"
                                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain border border-white/15 shadow-2xl"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Motivo de Ingreso */}
                  <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-2 text-xs shadow-xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-300">
                        Motivo de Ingreso
                      </label>
                    </div>

                    <textarea
                      rows={2}
                      value={motivoIngreso}
                      onChange={(e) => setMotivoIngreso(e.target.value)}
                      placeholder={
                        tipoIngreso === "Lubricentro"
                          ? "Ej: Cambio de aceite..."
                          : tipoIngreso === "Lavado"
                            ? "Ej: Lavado general..."
                            : "Ej: Ruido al frenar..."
                      }
                      className="w-full p-3 rounded-xl bg-white dark:bg-black/40 border border-zinc-300 dark:border-white/15 focus:border-blue-500 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-xs sm:text-sm focus:outline-none resize-none leading-relaxed shadow-xs"
                    />


                  </div>

                  {/* Botón para continuar al Paso 4 (oculto en Editar Ingreso) */}
                  {!editOrderId && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => irAPaso(4)}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95"
                      >
                        <span>Continuar</span>
                        <span>→</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* =================================================================
              PASO 4: ORDEN (ASIGNACIÓN DE TÉCNICOS, DETALLES FINALES Y CREAR)
              ================================================================= */}
              {pasoActivo === 4 && (
                <div className="space-y-5 animate-fade-in">
                  {/* Formulario de Asignación de Técnicos */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="block text-zinc-700 dark:text-zinc-300 font-semibold text-xs flex items-center gap-2">
                        <span>Técnicos Asignados</span>
                        {asignacionesTecnicos.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-500/30">
                            {asignacionesTecnicos.length}
                          </span>
                        )}
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setFlotanteTecnicoSeleccionado("");
                          setBusquedaTecnico("");
                          setFlotanteTarea("");
                          setMostrarDropdownTecnicos(true);
                          setMostrarFlotanteAsignar(true);
                        }}
                        className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/20 active:scale-95"
                      >
                        <span className="text-sm font-bold leading-none">+</span>
                        <span>Asignar Técnico</span>
                      </button>
                    </div>

                    {/* Tarjetas de Técnicos Asignados y Qué van a hacer */}
                    {asignacionesTecnicos.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {asignacionesTecnicos.map((asig) => (
                          <div
                            key={asig.id}
                            className="p-3 rounded-2xl bg-zinc-50/70 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 transition-all flex items-start justify-between gap-3 group shadow-xs"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-blue-600/15 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-500/30">
                                {asig.nombre.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <strong className="text-zinc-900 dark:text-white text-xs block truncate">{asig.nombre}</strong>
                                {asig.tarea && (
                                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                                    <span className="text-blue-600 dark:text-blue-400">📋</span>
                                    <span className="truncate">{asig.tarea}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setAsignacionesTecnicos((prev) => prev.filter((a) => a.id !== asig.id))}
                              className="w-6 h-6 rounded-lg bg-zinc-200/60 dark:bg-white/5 hover:bg-red-500/20 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0 text-xs"
                              title="Quitar técnico"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>


                </div>
              )}

              {/* FLOTANTE / MODAL DE ASIGNACIÓN DE TÉCNICO Y TAREA */}
              {mostrarFlotanteAsignar && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                  <div className="w-full max-w-md bg-white dark:bg-[#16161a] border border-zinc-200 dark:border-white/15 rounded-3xl shadow-2xl p-5 space-y-4 animate-scale-in">
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-blue-600/15 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm border border-blue-500/30">
                          👷
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Asignar Técnico</h4>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMostrarFlotanteAsignar(false)}
                        className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Seleccionar Empleado con Buscador Dropdown */}
                    <div className="space-y-1.5 relative" ref={dropdownTecnicoRef}>
                      <label className="block text-zinc-700 dark:text-zinc-300 font-semibold text-xs">
                        Técnico:
                      </label>

                      <div className="relative">
                        <input
                          type="text"
                          value={busquedaTecnico}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBusquedaTecnico(val);
                            setMostrarDropdownTecnicos(val.trim().length > 0);
                          }}
                          onFocus={() => {
                            if (busquedaTecnico.trim().length > 0) {
                              setMostrarDropdownTecnicos(true);
                            }
                          }}
                          placeholder="Buscar..."
                          className="w-full h-11 pl-10 pr-16 rounded-xl bg-white dark:bg-black/40 border border-zinc-300 dark:border-white/15 focus:border-blue-500 text-zinc-900 dark:text-white text-xs sm:text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all cursor-text shadow-xs"
                        />
                        <svg
                          className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>

                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {busquedaTecnico && (
                            <button
                              type="button"
                              onClick={() => {
                                setBusquedaTecnico("");
                                setFlotanteTecnicoSeleccionado("");
                                setMostrarDropdownTecnicos(false);
                              }}
                              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer p-1 text-xs"
                              title="Borrar nombre"
                            >
                              ✕
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setMostrarDropdownTecnicos((prev) => !prev)}
                            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer p-1"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${mostrarDropdownTecnicos ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Dropdown flotante con los técnicos (solo al buscar) */}
                      {mostrarDropdownTecnicos && busquedaTecnico.trim().length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-[#16161b] border border-zinc-200 dark:border-white/15 rounded-2xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                          {mecanicosFiltrados.length > 0 ? (
                            <div className="p-1 space-y-0.5">
                              {mecanicosFiltrados.map((m) => {
                                const seleccionado = flotanteTecnicoSeleccionado.trim().toLowerCase() === m.trim().toLowerCase();
                                return (
                                  <div
                                    key={m}
                                    onClick={() => {
                                      setFlotanteTecnicoSeleccionado(m);
                                      setBusquedaTecnico(m);
                                      setMostrarDropdownTecnicos(false);
                                    }}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-between transition-colors ${seleccionado
                                      ? "bg-blue-600 text-white font-semibold"
                                      : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.08]"
                                      }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${seleccionado ? "bg-white" : "bg-emerald-400"}`} />
                                      <span className="truncate">{m}</span>
                                      {(() => {
                                        const emp = empleadosDb.find((e) => e.name.trim().toLowerCase() === m.trim().toLowerCase());
                                        return emp?.role ? (
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded ml-1 ${seleccionado ? "bg-blue-700 text-blue-100" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"}`}>
                                            {emp.role}
                                          </span>
                                        ) : null;
                                      })()}
                                    </div>
                                    {seleccionado && <span className="text-xs">✓</span>}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 text-center space-y-2">
                              <p className="text-xs text-zinc-600 dark:text-zinc-400">No se encontró "{busquedaTecnico}"</p>
                              {busquedaTecnico.trim() && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFlotanteTecnicoSeleccionado(busquedaTecnico.trim());
                                    setBusquedaTecnico(busquedaTecnico.trim());
                                    setMostrarDropdownTecnicos(false);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                                >
                                  Usar "{busquedaTecnico.trim()}"
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Qué va a hacer */}
                    <div className="space-y-1.5">
                      <label className="block text-zinc-700 dark:text-zinc-300 font-semibold text-xs">
                        Labor:
                      </label>
                      <input
                        type="text"
                        value={flotanteTarea}
                        onChange={(e) => setFlotanteTarea(e.target.value)}
                        placeholder="Labor..."
                        className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/40 border border-zinc-300 dark:border-white/10 focus:border-blue-500 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-xs sm:text-sm focus:outline-none shadow-xs"
                        autoFocus
                      />

                      {/* Sugerencias Rápidas de Tarea */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(tipoIngreso === "Lubricentro"
                          ? [
                            { nombre: "Aceite", color: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20" },
                            { nombre: "Filtros", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20" },
                            { nombre: "Fluidos", color: "bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20" },
                            { nombre: "Frenos", color: "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20" },
                            { nombre: "Batería", color: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20" },
                            { nombre: "Engrase", color: "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20" },
                          ]
                          : [
                            { nombre: "Diagnóstico", color: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20" },
                            { nombre: "Mantenimiento", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20" },
                            { nombre: "Frenos", color: "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20" },
                            { nombre: "Motor", color: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20" },
                            { nombre: "Suspensión", color: "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20" },
                            { nombre: "Eléctrico", color: "bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20" },
                          ]
                        ).map((sug) => (
                          <button
                            key={sug.nombre}
                            type="button"
                            onClick={() => setFlotanteTarea(sug.nombre)}
                            className={`px-2.5 py-1 rounded-xl border text-xs font-normal transition-all cursor-pointer ${sug.color}`}
                          >
                            {sug.nombre}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Botón Guardar Asignación */}
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setMostrarFlotanteAsignar(false)}
                        className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!flotanteTecnicoSeleccionado.trim() && !busquedaTecnico.trim()}
                        onClick={() => {
                          const tecnicoFinal = flotanteTecnicoSeleccionado.trim() || busquedaTecnico.trim();
                          if (!tecnicoFinal) return;
                          const nuevaAsig = {
                            id: `asig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                            nombre: tecnicoFinal,
                            tarea: flotanteTarea.trim(),
                          };
                          setAsignacionesTecnicos((prev) => [
                            ...prev.filter((a) => a.nombre !== tecnicoFinal),
                            nuevaAsig,
                          ]);
                          setMostrarFlotanteAsignar(false);
                          setFlotanteTecnicoSeleccionado("");
                          setBusquedaTecnico("");
                          setFlotanteTarea("");
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-600/30"
                      >
                        Registrar Asignación
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* FLOTANTE / MODAL DE SELECCIÓN DE MARCA Y MODELO (ELIMINADO) */}
              {false && mostrarFlotanteVehiculo && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
                  <div className="w-full max-w-lg bg-white dark:bg-[#16161b] border border-zinc-200 dark:border-white/15 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 animate-scale-in max-h-[90vh] flex flex-col">
                    {/* Header del flotante */}
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-base border border-emerald-500/30">
                          🚗
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                            {tabFlotanteVehiculo === "marca"
                              ? "Escoger Marca del Vehículo"
                              : `Escoger Modelo (${vehiculoMarca || "General"})`}
                          </h4>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 font-normal">
                            {tabFlotanteVehiculo === "marca"
                              ? "Selecciona una marca del catálogo o escribe para buscar"
                              : `Modelos disponibles para ${vehiculoMarca || "el vehículo"}`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMostrarFlotanteVehiculo(false)}
                        className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Tabs Marca / Modelo */}
                    <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-black/40 p-1 rounded-2xl border border-zinc-200 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          setTabFlotanteVehiculo("marca");
                          setBusquedaFlotanteVehiculo("");
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${tabFlotanteVehiculo === "marca"
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                          }`}
                      >
                        <span>1. Marca</span>
                        {vehiculoMarca && <span className="opacity-80 font-normal truncate max-w-[90px]">({vehiculoMarca})</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTabFlotanteVehiculo("modelo");
                          setBusquedaFlotanteVehiculo("");
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${tabFlotanteVehiculo === "modelo"
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                          }`}
                      >
                        <span>2. Modelo</span>
                        {vehiculoModelo && <span className="opacity-80 font-normal truncate max-w-[90px]">({vehiculoModelo})</span>}
                      </button>
                    </div>

                    {/* Buscador */}
                    <div className="relative">
                      <input
                        type="text"
                        value={busquedaFlotanteVehiculo}
                        onChange={(e) => setBusquedaFlotanteVehiculo(e.target.value)}
                        placeholder={
                          tabFlotanteVehiculo === "marca"
                            ? "Buscar marca (Ej: Toyota, Chevrolet, Kia, Nissan...)"
                            : `Buscar modelo de ${vehiculoMarca || "vehículo"}...`
                        }
                        className="w-full h-11 pl-10 pr-20 rounded-2xl bg-white dark:bg-black/40 border border-zinc-300 dark:border-white/15 focus:border-emerald-500 text-zinc-900 dark:text-white text-xs sm:text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all shadow-xs"
                        autoFocus
                      />
                      <svg
                        className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {busquedaFlotanteVehiculo && (
                        <button
                          type="button"
                          onClick={() => setBusquedaFlotanteVehiculo("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-lg bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>

                    {/* Lista con scroll de marcas o modelos */}
                    <div className="flex-1 overflow-y-auto max-h-72 space-y-2 pr-1">
                      {tabFlotanteVehiculo === "marca" ? (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {marcasFlotante.map((marca) => {
                              const activo = vehiculoMarca.trim().toLowerCase() === marca.toLowerCase();
                              return (
                                <button
                                  key={marca}
                                  type="button"
                                  onClick={() => seleccionarMarcaFlotante(marca)}
                                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${activo
                                    ? "bg-emerald-600/15 dark:bg-emerald-600/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500/30"
                                    : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white"
                                    }`}
                                >
                                  <span className="text-xs truncate">{marca}</span>
                                  {activo ? (
                                    <span className="text-emerald-400 text-xs">✓</span>
                                  ) : (
                                    <span className="text-zinc-500 text-[10px]">→</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {busquedaFlotanteVehiculo.trim() && !marcasFlotante.some(m => m.toLowerCase() === busquedaFlotanteVehiculo.trim().toLowerCase()) && (
                            <div className="pt-2 text-center">
                              <button
                                type="button"
                                onClick={() => seleccionarMarcaFlotante(busquedaFlotanteVehiculo.trim())}
                                className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold cursor-pointer transition-all"
                              >
                                Usar marca personalizada: &ldquo;{busquedaFlotanteVehiculo.trim()}&rdquo; →
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {modelosFlotante.map((modelo) => {
                              const activo = vehiculoModelo.trim().toLowerCase() === modelo.toLowerCase();
                              return (
                                <button
                                  key={modelo}
                                  type="button"
                                  onClick={() => seleccionarModeloFlotante(modelo)}
                                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${activo
                                    ? "bg-emerald-600/15 dark:bg-emerald-600/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500/30"
                                    : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white"
                                    }`}
                                >
                                  <span className="text-xs truncate">{modelo}</span>
                                  {activo && <span className="text-emerald-400 text-xs">✓</span>}
                                </button>
                              );
                            })}
                          </div>

                          {busquedaFlotanteVehiculo.trim() && !modelosFlotante.some(m => m.toLowerCase() === busquedaFlotanteVehiculo.trim().toLowerCase()) && (
                            <div className="pt-2 text-center">
                              <button
                                type="button"
                                onClick={() => seleccionarModeloFlotante(busquedaFlotanteVehiculo.trim())}
                                className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold cursor-pointer transition-all"
                              >
                                Usar modelo personalizado: &ldquo;{busquedaFlotanteVehiculo.trim()}&rdquo; ✓
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Footer del flotante */}
                    <div className="flex items-center justify-between border-t border-zinc-200 dark:border-white/10 pt-3">
                      {tabFlotanteVehiculo === "modelo" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTabFlotanteVehiculo("marca");
                            setBusquedaFlotanteVehiculo("");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs cursor-pointer flex items-center gap-1"
                        >
                          <span>←</span>
                          <span>Volver</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-500 font-normal">
                          {marcasFlotante.length} marcas en catálogo
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setMostrarFlotanteVehiculo(false)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/30"
                      >
                        Listo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pie Inferior: Navegación y Fecha */}
            <div
              className={
                isPageMode
                  ? "p-3.5 sm:p-5 bg-zinc-50/70 dark:bg-white/[0.02] flex items-center justify-end gap-3 shrink-0"
                  : "px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-end gap-3 bg-zinc-50/70 dark:bg-white/[0.02] shrink-0"
              }
            >
              {/* Fecha y Hora de Recepción alineada a la derecha al final */}
              {fechaHoraRecepcion && (
                <div className="flex items-center">
                  <span
                    title="Fecha y hora de recepción"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-200/60 dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-400 text-xs font-mono font-semibold min-w-0"
                  >
                    <svg className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <circle cx="12" cy="12" r="9" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                    </svg>
                    <span className="truncate">{fechaHoraRecepcion}</span>
                  </span>
                </div>
              )}

              {/* Botones de acción final (Guardar o Crear orden) en el paso final o edición */}
              {(editOrderId || pasoActivo === 4) && (
                <div className="flex items-center gap-2 shrink-0">
                  {editOrderId && pasoActivo < 4 && (
                    <button
                      type="button"
                      onClick={handleCrearOrdenFinal}
                      disabled={creando}
                      className="px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center shadow-md shadow-emerald-600/25 active:scale-95 min-h-[44px] disabled:opacity-50"
                    >
                      <span>{creando ? "Guardando..." : "Guardar"}</span>
                    </button>
                  )}
                  {pasoActivo === 4 && (
                    <button
                      type="button"
                      onClick={handleCrearOrdenFinal}
                      disabled={creando}
                      className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-400/40 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md shadow-blue-600/30 active:scale-95 disabled:opacity-50 flex items-center gap-2 min-h-[44px]"
                    >
                      {creando ? (
                        <>
                          <svg
                            className="w-4 h-4 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                            />
                          </svg>
                          <span>{editOrderId ? "Guardando..." : "Creando orden..."}</span>
                        </>
                      ) : (
                        <>
                          <span>{editOrderId ? "Guardar" : "Crear orden"}</span>
                          <span>✓</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );

      if (isPageMode) {
        return cardContent;
      }

      return (
        <div
          onClick={handleCancelarSinGuardar}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          {cardContent}
        </div>
      );
    }
