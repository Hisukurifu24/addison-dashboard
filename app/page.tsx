"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { motion } from "framer-motion";
import { createWorker } from "tesseract.js";

/**
 * Addison Dashboard v3.0 - Advanced Edition
 * Comprehensive Addison's disease management system
 * Features: Emergency protocols, therapy management, medical ID, references
 * Advanced AddiDose++ algorithm with complete clinical decision support
 */

interface PatientRecord {
	date: string;
	na?: number | null;
	k?: number | null;
	acth?: number | null;
	cortisol?: number | null;
	renin?: number | null;
	bpSupSys?: number | null;  // PA supina sistolica
	bpSupDia?: number | null;  // PA supina diastolica
	bpOrthSys?: number | null; // PA ortostatica sistolica
	bpOrthDia?: number | null; // PA ortostatica diastolica
	craveSalt?: boolean;
	vertigo?: boolean;
	// Parametri Qualità della Vita (AddiQoL-inspired)
	fatigue?: number | null;        // Affaticamento (1-5)
	moodChanges?: number | null;    // Cambiamenti umore (1-5) 
	workCapacity?: number | null;   // Capacità lavorativa (1-5)
	socialLife?: number | null;     // Vita sociale (1-5)
	sleepQuality?: number | null;   // Qualità sonno (1-5)
	physicalAppearance?: number | null; // Aspetto fisico (1-5)
	overallWellbeing?: number | null;   // Benessere generale (1-5)
	treatmentSatisfaction?: number | null; // Soddisfazione terapia (1-5)
}

interface TherapyDose {
	morning: number;
	midday: number;
	evening: number;
	total?: number;
}

interface CurrentTherapy {
	cortisoneAcetate: TherapyDose;
	florinef: number;
}

// ===== SISTEMA PAZIENTE AVANZATO ===== //
interface PatientDemographics {
	age: number;
	weight: number;
	height: number;
	sex: 'M' | 'F';
	diagnosis: string;
	diagnosisDate: string;
	comorbidities: string[];
}

interface TherapyHistoryEntry {
	date: string;
	therapy: CurrentTherapy;
	duration: number; // giorni
	reason: string;
	prescriber: string;
	effectiveness: 'excellent' | 'good' | 'fair' | 'poor' | null;
	sideEffects: string[];
}

interface ResponsePattern {
	cortisoneToACTH: number; // correlazione personale (-1 to 1)
	optimalDistribution: [number, number, number]; // % mattina/mezzo/sera
	stressResponse: 'high' | 'normal' | 'low';
	averageQoL: number;
	stabilityScore: number; // 0-100
	doseResponseSlope: number; // mg/parametro
}

interface PatientProfile {
	id: string;
	firstName: string;
	lastName: string;
	dateOfBirth: string;
	demographics: PatientDemographics;
	therapyHistory: TherapyHistoryEntry[];
	responsePatterns: ResponsePattern;
	notes: string[];
	lastUpdated: string;
	riskFactors: string[];
}

interface PredictiveAnalysis {
	recommendedDose: number;
	confidence: number; // 0-100
	reasoning: string[];
	riskFactors: string[];
	expectedOutcome: {
		acthImprovement: number;
		qolImprovement: number;
		stabilityScore: number;
	};
}

interface EnhancedRecommendation {
	standard: string[];
	personalized: string[];
	predictive: string[];
	warnings: string[];
	followUp: string[];
	confidence: number;
}

// ===== SISTEMA IMPORTAZIONE CLINICA ===== //
interface ClinicalDocument {
	id: string;
	fileName: string;
	fileType: 'pdf' | 'txt' | 'json' | 'csv' | 'docx' | 'image';
	uploadDate: string;
	content: string;
	extractedData: Partial<PatientProfile>;
	processingStatus: 'pending' | 'processing' | 'completed' | 'error';
	confidence: number;
}

interface ImportedTherapyData {
	date: string;
	medications: {
		cortisone?: number;
		florinef?: number;
		otherMeds?: string[];
	};
	dosage: {
		morning?: number;
		midday?: number;
		evening?: number;
	};
	notes: string;
	prescriber?: string;
	duration?: number;
}

interface LabImportData {
	date: string;
	results: {
		acth?: number;
		cortisol?: number;
		na?: number;
		k?: number;
		renin?: number;
		glucose?: number;
		hb?: number;
	};
	units: Record<string, string>;
	labName: string;
}

// Unit system interface
interface UnitSystem {
	na: 'mEq/L' | 'mmol/L';
	k: 'mEq/L' | 'mmol/L';
	acth: 'pg/mL' | 'pmol/L';
	cortisol: 'μg/dL' | 'nmol/L';
	renin: 'ng/mL/h' | 'μg/L/h' | 'mUI/L';
	bp: 'mmHg' | 'kPa';
}

export default function AddisonDashboard() {
	// ===== State ===== //
	const [records, setRecords] = useState<PatientRecord[]>([]);
	const [suggestion, setSuggestion] = useState("Carica o inserisci dati per raccomandazioni");
	const [currentTherapy, setCurrentTherapy] = useState<CurrentTherapy>({
		cortisoneAcetate: { morning: 18.75, midday: 6.25, evening: 6.25 },
		florinef: 0.1
	});
	const [proposedTherapy, setProposedTherapy] = useState<CurrentTherapy | null>(null);
	const [isEditingTherapy, setIsEditingTherapy] = useState(false);
	const [editingTherapy, setEditingTherapy] = useState<CurrentTherapy>(currentTherapy);
	const [therapyErrors, setTherapyErrors] = useState<string[]>([]);

	// ===== PATIENT MANAGEMENT SYSTEM ===== //
	const [patients, setPatients] = useState<PatientProfile[]>([]);
	const [currentPatient, setCurrentPatient] = useState<PatientProfile | null>(null);
	const [showPatientDialog, setShowPatientDialog] = useState(false);
	const [showTherapyHistory, setShowTherapyHistory] = useState(false);
	const [predictiveAnalysis, setPredictiveAnalysis] = useState<PredictiveAnalysis | null>(null);
	const [smartNotifications, setSmartNotifications] = useState<string[]>([]);
	const [learningMode, setLearningMode] = useState(true);

	// ===== CLINICAL DOCUMENT IMPORT SYSTEM ===== //
	const [uploadedDocuments, setUploadedDocuments] = useState<ClinicalDocument[]>([]);
	const [isProcessingDoc, setIsProcessingDoc] = useState(false);
	const [showImportDialog, setShowImportDialog] = useState(false);
	const [importProgress, setImportProgress] = useState(0);
	const [showNewRecordForm, setShowNewRecordForm] = useState(false);
	const [newRecordDate, setNewRecordDate] = useState(() => {
		const today = new Date();
		const day = today.getDate().toString().padStart(2, '0');
		const month = (today.getMonth() + 1).toString().padStart(2, '0');
		const year = today.getFullYear();
		return `${day}/${month}/${year}`;
	});
	const [patientSearchTerm, setPatientSearchTerm] = useState('');
	const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);

	// ===== DATE UTILITY FUNCTIONS ===== //
	// Function to convert dd/mm/yyyy to ISO date format
	const convertToISO = (dateString: string): string => {
		if (!dateString) return '';
		// If already in ISO format (yyyy-mm-dd), return as is
		if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
		// If in dd/mm/yyyy format, convert
		if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
			const [day, month, year] = dateString.split('/');
			return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
		}
		return '';
	};

	// Function to convert ISO date format to dd/mm/yyyy
	const convertToDisplayFormat = (dateString: string): string => {
		if (!dateString) return '';
		// If already in dd/mm/yyyy format, return as is
		if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateString;
		// If in ISO format (yyyy-mm-dd), convert
		if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
			const [year, month, day] = dateString.split('-');
			return `${day}/${month}/${year}`;
		}
		return dateString;
	};

	// Function to format date input as dd/mm/yyyy
	const formatDateInput = (value: string): string => {
		// Remove all non-numeric characters
		const numbers = value.replace(/\D/g, '');

		// Add slashes at appropriate positions
		if (numbers.length <= 2) {
			return numbers;
		} else if (numbers.length <= 4) {
			return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
		} else {
			return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
		}
	};

	// Caricamento pazienti dal localStorage
	useEffect(() => {
		const savedPatients = localStorage.getItem('addi-patients');
		if (savedPatients) {
			const parsedPatients = JSON.parse(savedPatients);
			setPatients(parsedPatients);
		}
	}, []);

	// Salvataggio automatico pazienti
	useEffect(() => {
		if (patients.length > 0) {
			localStorage.setItem('addi-patients', JSON.stringify(patients));
		}
	}, [patients]);

	const savePatientData = (patient: PatientProfile) => {
		const updatedPatients = patients.filter(p => p.id !== patient.id);
		updatedPatients.push({ ...patient, lastUpdated: new Date().toISOString() });
		setPatients(updatedPatients);
	};

	const addTherapyEntry = (effectiveness: 'excellent' | 'good' | 'fair' | 'poor', sideEffects: string[] = []) => {
		if (!currentPatient) return;

		const newEntry: TherapyHistoryEntry = {
			date: new Date().toISOString().split('T')[0],
			therapy: { ...currentTherapy },
			duration: 30, // giorni default
			reason: "Aggiustamento secondo algoritmo",
			prescriber: "AddiDose++",
			effectiveness,
			sideEffects
		};

		const updatedPatient = {
			...currentPatient,
			therapyHistory: [...currentPatient.therapyHistory, newEntry],
			responsePatterns: analyzePatientResponse({
				...currentPatient,
				therapyHistory: [...currentPatient.therapyHistory, newEntry]
			})
		};

		savePatientData(updatedPatient);
		setCurrentPatient(updatedPatient);
	};

	// Filter patients based on search term
	const filteredPatients = patients.filter(patient =>
		`${patient.firstName} ${patient.lastName}`.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
		patient.demographics.diagnosis.toLowerCase().includes(patientSearchTerm.toLowerCase())
	);

	// ===== DOCUMENT PARSING ENGINE ===== //
	const parseTextDocument = (content: string): Partial<PatientProfile> => {
		const extractedData: Partial<PatientProfile> = {};
		const contentLower = content.toLowerCase();

		// Estrazione dati demografici
		const ageMatch = content.match(/età[:\s]+(\d{1,3})|anni[:\s]+(\d{1,3})|age[:\s]+(\d{1,3})/i);
		const weightMatch = content.match(/peso[:\s]+(\d{1,3}(?:\.\d{1,2})?)\s*kg|weight[:\s]+(\d{1,3}(?:\.\d{1,2})?)\s*kg/i);
		const heightMatch = content.match(/altezza[:\s]+(\d{2,3})\s*cm|height[:\s]+(\d{2,3})\s*cm/i);

		if (ageMatch) {
			const age = parseInt(ageMatch[1] || ageMatch[2] || ageMatch[3]);
			if (!extractedData.demographics) extractedData.demographics = {} as PatientDemographics;
			extractedData.demographics.age = age;
		}

		if (weightMatch) {
			const weight = parseFloat(weightMatch[1] || weightMatch[2]);
			if (!extractedData.demographics) extractedData.demographics = {} as PatientDemographics;
			extractedData.demographics.weight = weight;
		}

		if (heightMatch) {
			const height = parseInt(heightMatch[1] || heightMatch[2]);
			if (!extractedData.demographics) extractedData.demographics = {} as PatientDemographics;
			extractedData.demographics.height = height;
		}

		// Estrazione nome
		const nomeMatch = content.match(/nome[:\s]+([A-Za-zÀ-ÿ\s]+)|patient[:\s]+([A-Za-zÀ-ÿ\s]+)/i);
		if (nomeMatch) {
			const fullName = (nomeMatch[1] || nomeMatch[2]).trim();
			const nameParts = fullName.split(/\s+/);
			if (nameParts.length >= 2) {
				extractedData.firstName = nameParts[0];
				extractedData.lastName = nameParts.slice(1).join(' ');
			}
		}

		// Estrazione diagnosi
		if (contentLower.includes('addison') || contentLower.includes('surrenale') || contentLower.includes('insufficienza')) {
			if (!extractedData.demographics) extractedData.demographics = {} as PatientDemographics;
			extractedData.demographics.diagnosis = "Malattia di Addison";
		}

		// Estrazione terapie
		const therapyHistory: TherapyHistoryEntry[] = [];
		const cortisoneDoses = content.match(/cortisone[:\s]+(\d{1,2}(?:\.\d{1,2})?)\s*mg|idrocortisone[:\s]+(\d{1,2}(?:\.\d{1,2})?)\s*mg/gi);
		const florinefDoses = content.match(/florinef[:\s]+(\d{1}(?:\.\d{1,3})?)\s*mg|fludrocortisone[:\s]+(\d{1}(?:\.\d{1,3})?)\s*mg/gi);

		if (cortisoneDoses && cortisoneDoses.length > 0) {
			const dose = parseFloat(cortisoneDoses[0].match(/(\d{1,2}(?:\.\d{1,2})?)/)?.[1] || '25');
			const florinefDose = florinefDoses ? parseFloat(florinefDoses[0].match(/(\d{1}(?:\.\d{1,3})?)/)?.[1] || '0.1') : 0.1;

			therapyHistory.push({
				date: new Date().toISOString().split('T')[0],
				therapy: {
					cortisoneAcetate: {
						morning: dose * 0.5,
						midday: dose * 0.3,
						evening: dose * 0.2
					},
					florinef: florinefDose
				},
				duration: 30,
				reason: "Importato da documento clinico",
				prescriber: "Medico curante",
				effectiveness: null,
				sideEffects: []
			});
		}

		if (therapyHistory.length > 0) {
			extractedData.therapyHistory = therapyHistory;
		}

		// Estrazione comorbidità
		const comorbidities = [];
		if (contentLower.includes('diabete')) comorbidities.push('Diabete');
		if (contentLower.includes('tiroide') || contentLower.includes('hashimoto')) comorbidities.push('Tiroidite');
		if (contentLower.includes('celiachia')) comorbidities.push('Celiachia');
		if (contentLower.includes('vitiligine')) comorbidities.push('Vitiligine');

		if (comorbidities.length > 0) {
			if (!extractedData.demographics) extractedData.demographics = {} as PatientDemographics;
			extractedData.demographics.comorbidities = comorbidities;
		}

		return extractedData;
	};

	const parseLabResults = (content: string): PatientRecord[] => {
		const results: PatientRecord[] = [];
		const lines = content.split('\n');

		for (const line of lines) {
			const record: Partial<PatientRecord> = {
				date: new Date().toISOString().split('T')[0]
			};

			// Parse ACTH
			const acthMatch = line.match(/acth[:\s]+(\d{1,4}(?:\.\d{1,2})?)/i);
			if (acthMatch) record.acth = parseFloat(acthMatch[1]);

			// Parse Cortisolo
			const cortisolMatch = line.match(/cortisol[o]?[:\s]+(\d{1,3}(?:\.\d{1,2})?)/i);
			if (cortisolMatch) record.cortisol = parseFloat(cortisolMatch[1]);

			// Parse Sodio
			const naMatch = line.match(/na[:\s]+(\d{2,3})|sodio[:\s]+(\d{2,3})/i);
			if (naMatch) record.na = parseInt(naMatch[1] || naMatch[2]);

			// Parse Potassio
			const kMatch = line.match(/k[:\s]+(\d{1,2}(?:\.\d{1,2})?)|potassio[:\s]+(\d{1,2}(?:\.\d{1,2})?)/i);
			if (kMatch) record.k = parseFloat(kMatch[1] || kMatch[2]);

			// Parse Renina
			const reninMatch = line.match(/renin[a]?[:\s]+(\d{1,3}(?:\.\d{1,2})?)/i);
			if (reninMatch) record.renin = parseFloat(reninMatch[1]);

			// Se trovati dati, aggiungi il record
			if (Object.keys(record).length > 1) {
				results.push(record as PatientRecord);
			}
		}

		return results;
	};

	const processUploadedFile = async (file: File): Promise<ClinicalDocument> => {
		setIsProcessingDoc(true);
		setImportProgress(0);

		const doc: ClinicalDocument = {
			id: Date.now().toString(),
			fileName: file.name,
			fileType: file.name.split('.').pop()?.toLowerCase() as any || 'txt',
			uploadDate: new Date().toISOString(),
			content: '',
			extractedData: {},
			processingStatus: 'processing',
			confidence: 0
		};

		try {
			setImportProgress(25);

			// Lettura file
			if (file.type.includes('text') || file.name.endsWith('.txt')) {
				doc.content = await file.text();
			} else if (file.type.includes('json')) {
				const jsonContent = JSON.parse(await file.text());
				doc.content = JSON.stringify(jsonContent, null, 2);
			} else if (file.type.includes('image')) {
				// OCR per immagini
				const worker = await createWorker();
				await worker.loadLanguage('ita');
				await worker.initialize('ita');
				const { data: { text } } = await worker.recognize(file);
				doc.content = text;
				await worker.terminate();
			} else {
				// Fallback per altri formati
				doc.content = await file.text();
			}

			setImportProgress(60);

			// Parsing intelligente
			doc.extractedData = parseTextDocument(doc.content);

			// Parsing risultati lab aggiuntivi
			const labResults = parseLabResults(doc.content);
			if (labResults.length > 0) {
				setRecords(prev => [...prev, ...labResults]);
			}

			setImportProgress(80);

			// Calcolo confidence
			const dataFields = Object.keys(doc.extractedData).length;
			doc.confidence = Math.min(95, dataFields * 15 + 20);
			doc.processingStatus = 'completed';

			setImportProgress(100);

		} catch (error) {
			console.error('Errore processing:', error);
			doc.processingStatus = 'error';
			doc.confidence = 0;
		} finally {
			setIsProcessingDoc(false);
			setTimeout(() => setImportProgress(0), 2000);
		}

		return doc;
	};

	const handleFileUpload = async (files: FileList) => {
		const newDocs: ClinicalDocument[] = [];

		for (let i = 0; i < files.length; i++) {
			const processedDoc = await processUploadedFile(files[i]);
			newDocs.push(processedDoc);
		}

		setUploadedDocuments(prev => [...prev, ...newDocs]);

		// Auto-merge dati se confidence alta
		const highConfidenceDocs = newDocs.filter(d => d.confidence > 70);
		if (highConfidenceDocs.length > 0 && !currentPatient) {
			const mergedData = highConfidenceDocs.reduce((acc, doc) => ({
				...acc,
				...doc.extractedData
			}), {} as Partial<PatientProfile>);

			if (Object.keys(mergedData).length > 3) {
				// Crea automaticamente profilo paziente
				const autoPatient: PatientProfile = {
					id: Date.now().toString(),
					firstName: mergedData.firstName || 'Paziente',
					lastName: mergedData.lastName || 'Importato',
					dateOfBirth: mergedData.dateOfBirth || '',
					demographics: mergedData.demographics || {
						age: 40,
						weight: 70,
						height: 170,
						sex: 'M',
						diagnosis: 'Malattia di Addison',
						diagnosisDate: new Date().toISOString().split('T')[0],
						comorbidities: []
					},
					therapyHistory: mergedData.therapyHistory || [],
					responsePatterns: {
						cortisoneToACTH: 0,
						optimalDistribution: [40, 30, 30],
						stressResponse: 'normal',
						averageQoL: 50,
						stabilityScore: 50,
						doseResponseSlope: 0.5
					},
					notes: [`Profilo creato automaticamente da ${newDocs.length} documenti clinici`],
					lastUpdated: new Date().toISOString(),
					riskFactors: []
				};

				savePatientData(autoPatient);
				setCurrentPatient(autoPatient);
			}
		}
	};

	// Funzione di validazione per i valori della terapia
	const validateTherapyValues = (values: CurrentTherapy) => {
		const errors: string[] = [];

		const cortisoneTotal = values.cortisoneAcetate.morning + values.cortisoneAcetate.midday + values.cortisoneAcetate.evening;

		// Validazione Cortisone Acetato
		if (cortisoneTotal < 10 || cortisoneTotal > 60) {
			errors.push(`Dose totale cortisone (${cortisoneTotal}mg) fuori range raccomandato (10-60mg/die)`);
		}

		// Validazione distribuzione circadiana
		const morningPercentage = (values.cortisoneAcetate.morning / cortisoneTotal) * 100;
		if (morningPercentage < 50) {
			errors.push('La dose mattutina dovrebbe essere almeno il 50% del totale');
		}

		// Validazione Florinef
		if (values.florinef < 0.025 || values.florinef > 0.3) {
			errors.push(`Dose Florinef (${values.florinef}mg) fuori range raccomandato (0.025-0.3mg/die)`);
		}

		// Validazione incrementi (controllo con tolleranza per floating point)
		const tolerance = 0.001;
		const roundToQuarter = (dose: number) => Math.round(dose * 4) / 4;

		if (Math.abs(values.cortisoneAcetate.morning % 0.25) > tolerance) {
			errors.push(`Dose mattutina ${values.cortisoneAcetate.morning}mg non è un quarto valido. Suggerito: ${roundToQuarter(values.cortisoneAcetate.morning)}mg`);
		}
		if (Math.abs(values.cortisoneAcetate.midday % 0.25) > tolerance) {
			errors.push(`Dose mezzogiorno ${values.cortisoneAcetate.midday}mg non è un quarto valido. Suggerito: ${roundToQuarter(values.cortisoneAcetate.midday)}mg`);
		}
		if (Math.abs(values.cortisoneAcetate.evening % 0.25) > tolerance) {
			errors.push(`Dose serale ${values.cortisoneAcetate.evening}mg non è un quarto valido. Suggerito: ${roundToQuarter(values.cortisoneAcetate.evening)}mg`);
		}

		if (Math.abs((values.florinef * 1000) % 25) > 1) {
			errors.push('Usare incrementi di 0.025mg per il Florinef');
		}

		return errors;
	};

	const [imgLoading, setImgLoading] = useState(false);
	const [ocrProgress, setOcrProgress] = useState(0);
	const [extractedData, setExtractedData] = useState<Partial<PatientRecord> | null>(null);

	// Update newRecordDate when extractedData changes
	useEffect(() => {
		if (extractedData?.date) {
			setNewRecordDate(convertToDisplayFormat(extractedData.date));
		}
	}, [extractedData]);

	const [units, setUnits] = useState<UnitSystem>({
		na: 'mEq/L',
		k: 'mEq/L',
		acth: 'pg/mL',
		cortisol: 'μg/dL',
		renin: 'ng/mL/h',
		bp: 'mmHg'
	});
	const [inputUnits, setInputUnits] = useState<UnitSystem>({
		na: 'mEq/L',
		k: 'mEq/L',
		acth: 'pg/mL',
		cortisol: 'μg/dL',
		renin: 'ng/mL/h',
		bp: 'mmHg'
	});

	// ===== Unit Conversion Functions ===== //
	const convertValue = (value: number | null, parameter: keyof UnitSystem, fromUnit: string, toUnit: string): number | null => {
		if (value === null) return null;

		switch (parameter) {
			case 'na':
			case 'k':
				// mEq/L to mmol/L: multiply by 1 (same value)
				return value;
			case 'acth':
				// pg/mL to pmol/L: multiply by 0.22
				return fromUnit === 'pg/mL' && toUnit === 'pmol/L' ? value * 0.22 :
					fromUnit === 'pmol/L' && toUnit === 'pg/mL' ? value / 0.22 : value;
			case 'cortisol':
				// μg/dL to nmol/L: multiply by 27.59
				return fromUnit === 'μg/dL' && toUnit === 'nmol/L' ? value * 27.59 :
					fromUnit === 'nmol/L' && toUnit === 'μg/dL' ? value / 27.59 : value;
			case 'renin':
				// Conversioni renina:
				// ng/mL/h to μg/L/h: multiply by 1 (same numerical value)
				// ng/mL/h to mUI/L: multiply by 2.6
				// μg/L/h to mUI/L: multiply by 2.6
				if (fromUnit === 'ng/mL/h' && toUnit === 'mUI/L') return value * 2.6;
				if (fromUnit === 'mUI/L' && toUnit === 'ng/mL/h') return value / 2.6;
				if (fromUnit === 'μg/L/h' && toUnit === 'mUI/L') return value * 2.6;
				if (fromUnit === 'mUI/L' && toUnit === 'μg/L/h') return value / 2.6;
				return value;
			case 'bp':
				// mmHg to kPa: multiply by 0.133
				return fromUnit === 'mmHg' && toUnit === 'kPa' ? value * 0.133 :
					fromUnit === 'kPa' && toUnit === 'mmHg' ? value / 0.133 : value;
			default:
				return value;
		}
	};

	const displayValue = (value: number | null | undefined, parameter: keyof UnitSystem): string => {
		if (value === null || value === undefined) return "-";

		// Define standard storage units
		const standardUnits = {
			na: 'mEq/L',
			k: 'mEq/L',
			acth: 'pg/mL',
			cortisol: 'μg/dL',
			renin: 'ng/mL/h',
			bp: 'mmHg'
		};

		// Convert from standard storage unit to display unit
		const converted = convertValue(value, parameter, standardUnits[parameter], units[parameter]);
		return converted !== null ? converted.toFixed(parameter === 'cortisol' || parameter === 'acth' ? 1 : 0) : "-";
	};

	// ===== ENGINE DI ANALISI PREDITTIVA ===== //
	const analyzePatientResponse = (patient: PatientProfile): ResponsePattern => {
		const history = patient.therapyHistory;
		if (history.length < 2) {
			return {
				cortisoneToACTH: 0,
				optimalDistribution: [40, 30, 30],
				stressResponse: 'normal',
				averageQoL: 50,
				stabilityScore: 50,
				doseResponseSlope: 0.5
			};
		}

		// Analisi correlazione dose-risposta
		const correlations = history.map((entry, index) => {
			if (index === 0) return null;
			const prevEntry = history[index - 1];
			const currentTotal = entry.therapy.cortisoneAcetate.morning + entry.therapy.cortisoneAcetate.midday + entry.therapy.cortisoneAcetate.evening;
			const prevTotal = prevEntry.therapy.cortisoneAcetate.morning + prevEntry.therapy.cortisoneAcetate.midday + prevEntry.therapy.cortisoneAcetate.evening;
			const doseChange = currentTotal - prevTotal;
			const effectiveness = entry.effectiveness === 'excellent' ? 4 :
				entry.effectiveness === 'good' ? 3 :
					entry.effectiveness === 'fair' ? 2 : 1;
			return { doseChange, effectiveness };
		}).filter(Boolean); const avgCorrelation = correlations.length > 0 ?
			correlations.reduce((acc, curr) => acc + (curr!.doseChange * curr!.effectiveness), 0) / correlations.length : 0;

		// Calcolo stabilità terapeutica
		const effectivenessScores = history
			.filter(h => h.effectiveness)
			.map(h => h.effectiveness === 'excellent' ? 4 :
				h.effectiveness === 'good' ? 3 :
					h.effectiveness === 'fair' ? 2 : 1);

		const stabilityScore = effectivenessScores.length > 0 ?
			(effectivenessScores.reduce((a, b) => a + b, 0) / effectivenessScores.length) * 25 : 50;

		return {
			cortisoneToACTH: Math.max(-1, Math.min(1, avgCorrelation / 10)),
			optimalDistribution: calculateOptimalDistribution(history),
			stressResponse: patient.demographics.age > 65 ? 'low' : 'normal',
			averageQoL: stabilityScore * 2,
			stabilityScore,
			doseResponseSlope: Math.abs(avgCorrelation)
		};
	};

	const calculateOptimalDistribution = (history: TherapyHistoryEntry[]): [number, number, number] => {
		const successfulEntries = history.filter(h => h.effectiveness === 'excellent' || h.effectiveness === 'good');
		if (successfulEntries.length === 0) return [40, 30, 30];

		const avgDistribution = successfulEntries.reduce((acc, entry) => {
			const total = entry.therapy.cortisoneAcetate.morning + entry.therapy.cortisoneAcetate.midday + entry.therapy.cortisoneAcetate.evening;
			return [
				acc[0] + (entry.therapy.cortisoneAcetate.morning / total * 100),
				acc[1] + (entry.therapy.cortisoneAcetate.midday / total * 100),
				acc[2] + (entry.therapy.cortisoneAcetate.evening / total * 100)
			];
		}, [0, 0, 0]);

		return [
			Math.round(avgDistribution[0] / successfulEntries.length),
			Math.round(avgDistribution[1] / successfulEntries.length),
			Math.round(avgDistribution[2] / successfulEntries.length)
		];
	};

	const generatePredictiveAnalysis = (
		currentData: any,
		patient: PatientProfile | null
	): PredictiveAnalysis => {
		if (!patient) {
			const currentTotal = currentData.currentTherapy.cortisoneAcetate.morning +
				currentData.currentTherapy.cortisoneAcetate.midday +
				currentData.currentTherapy.cortisoneAcetate.evening;
			return {
				recommendedDose: currentTotal,
				confidence: 30,
				reasoning: ["Analisi basata su linee guida standard", "Nessuna storia clinica disponibile"],
				riskFactors: [],
				expectedOutcome: { acthImprovement: 0, qolImprovement: 0, stabilityScore: 50 }
			};
		}

		const patterns = patient.responsePatterns;
		const currentACTH = convertValue(currentData.acth, 'acth', units.acth, 'pg/mL') || 0;
		const currentDose = currentData.currentTherapy.cortisoneAcetate.morning +
			currentData.currentTherapy.cortisoneAcetate.midday +
			currentData.currentTherapy.cortisoneAcetate.evening;

		// Predizione basata su pattern personalizzati
		const targetACTH = 50; // pg/mL target
		const acthGap = currentACTH - targetACTH;
		const predictedDoseChange = acthGap * patterns.doseResponseSlope;
		const recommendedDose = Math.max(12.5, currentDose + predictedDoseChange);

		// Calcolo confidence basato su stabilità storica
		const confidence = Math.min(95, 40 + patterns.stabilityScore / 2);

		const reasoning = [
			`Basato su ${patient.therapyHistory.length} episodi terapeutici`,
			`Pattern di risposta personale: ${patterns.cortisoneToACTH > 0 ? 'responsivo' : 'standard'}`,
			`Distribuzione ottimale storicamente: ${patterns.optimalDistribution.join('%-')}%`,
			`Score di stabilità: ${Math.round(patterns.stabilityScore)}/100`
		];

		return {
			recommendedDose: Math.round(recommendedDose * 4) / 4, // quarti
			confidence,
			reasoning,
			riskFactors: patient.riskFactors,
			expectedOutcome: {
				acthImprovement: Math.min(100, Math.abs(acthGap) * 0.7),
				qolImprovement: patterns.averageQoL > 70 ? 15 : 25,
				stabilityScore: Math.min(100, patterns.stabilityScore + 10)
			}
		};
	};

	const getReferenceRanges = () => ({
		na: units.na === 'mEq/L' ? '136-145' : '136-145',
		k: units.k === 'mEq/L' ? '3.5-5.0' : '3.5-5.0',
		acth: units.acth === 'pg/mL' ? '10-50' : '2.2-11.0',
		cortisol: units.cortisol === 'μg/dL' ? '5-25' : '138-690',
		renin: units.renin === 'ng/mL/h' ? '0.3-4.0' :
			units.renin === 'μg/L/h' ? '0.3-4.0' : '0.8-10.4',
		bp: units.bp === 'mmHg' ? '90-140' : '12-19'
	});

	// ===== Handlers ===== //
	async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		setImgLoading(true);
		const worker = await createWorker({
			logger: m => setOcrProgress(Math.floor(m.progress * 100))
		});

		await worker.loadLanguage("ita");
		await worker.initialize("ita");
		const { data: { text } } = await worker.recognize(URL.createObjectURL(file));
		await worker.terminate();

		// regex extraction (simple)
		const na = text.match(/Na[^0-9]*(\d{2,3})/i);
		const k = text.match(/K[^0-9]*(\d\.\d)/i);
		const acth = text.match(/ACTH[^0-9]*(\d{2,4})/i);
		const cort = text.match(/cortisolo[^0-9]*(\d{1,2}\.?\d?)/i);

		// Salva i dati estratti per precompilare il form invece di salvare direttamente
		setExtractedData({
			date: new Date().toISOString().slice(0, 10),
			na: na ? +na[1] : null,
			k: k ? +k[1] : null,
			acth: acth ? +acth[1] : null,
			cortisol: cort ? +cort[1] : null,
			renin: null,
			bpSupSys: null,
			bpSupDia: null,
			bpOrthSys: null,
			bpOrthDia: null,
			craveSalt: false,
			vertigo: false,
			// Valori QoL iniziali null
			fatigue: null,
			moodChanges: null,
			workCapacity: null,
			socialLife: null,
			sleepQuality: null,
			physicalAppearance: null,
			overallWellbeing: null,
			treatmentSatisfaction: null
		});

		setImgLoading(false);
		setOcrProgress(0);
	}

	function handleAddManual(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const d = new FormData(e.currentTarget);

		const dateValue = d.get("date") as string;
		const naValue = d.get("na") as string;
		const kValue = d.get("k") as string;
		const acthValue = d.get("acth") as string;
		const cortValue = d.get("cort") as string;
		const reninValue = d.get("renin") as string;
		const bpSupSysValue = d.get("bpSupSys") as string;
		const bpSupDiaValue = d.get("bpSupDia") as string;
		const bpOrthSysValue = d.get("bpOrthSys") as string;
		const bpOrthDiaValue = d.get("bpOrthDia") as string;

		// Convert input values from input units to standard storage units (mEq/L, μg/dL, pg/mL, etc.)
		const convertToStandard = (value: string, param: keyof UnitSystem, inputUnit: string): number | null => {
			if (!value) return null;
			const numValue = +value;

			// Define standard units for storage
			const standardUnits = {
				na: 'mEq/L',
				k: 'mEq/L',
				acth: 'pg/mL',
				cortisol: 'μg/dL',
				renin: 'ng/mL/h',
				bp: 'mmHg'
			};

			// Convert from input unit to standard storage unit
			return convertValue(numValue, param, inputUnit, standardUnits[param]);
		};

		// Parsing dei valori QoL
		const parseQoLValue = (value: string | null) => value && value !== "" ? parseInt(value) : null;

		setRecords([...records, {
			date: convertToISO(newRecordDate),
			na: convertToStandard(naValue, 'na', inputUnits.na),
			k: convertToStandard(kValue, 'k', inputUnits.k),
			acth: convertToStandard(acthValue, 'acth', inputUnits.acth),
			cortisol: convertToStandard(cortValue, 'cortisol', inputUnits.cortisol),
			renin: convertToStandard(reninValue, 'renin', inputUnits.renin),
			bpSupSys: convertToStandard(bpSupSysValue, 'bp', inputUnits.bp),
			bpSupDia: convertToStandard(bpSupDiaValue, 'bp', inputUnits.bp),
			bpOrthSys: convertToStandard(bpOrthSysValue, 'bp', inputUnits.bp),
			bpOrthDia: convertToStandard(bpOrthDiaValue, 'bp', inputUnits.bp),
			craveSalt: d.get("crave") === 'on',
			vertigo: d.get("vert") === 'on',
			// Parametri Qualità della Vita
			fatigue: parseQoLValue(d.get("fatigue") as string),
			moodChanges: parseQoLValue(d.get("moodChanges") as string),
			workCapacity: parseQoLValue(d.get("workCapacity") as string),
			socialLife: parseQoLValue(d.get("socialLife") as string),
			sleepQuality: parseQoLValue(d.get("sleepQuality") as string),
			physicalAppearance: parseQoLValue(d.get("physicalAppearance") as string),
			overallWellbeing: parseQoLValue(d.get("overallWellbeing") as string),
			treatmentSatisfaction: parseQoLValue(d.get("treatmentSatisfaction") as string)
		}]);
		e.currentTarget.reset();

		// Reset date field to today
		const today = new Date();
		const day = today.getDate().toString().padStart(2, '0');
		const month = (today.getMonth() + 1).toString().padStart(2, '0');
		const year = today.getFullYear();
		setNewRecordDate(`${day}/${month}/${year}`);

		// Pulisci i dati estratti dall'immagine dopo il salvataggio
		setExtractedData(null);
	}

	function runAlgorithm() {
		if (!records.length) {
			setSuggestion("📋 ADDIDOSE++ ALGORITMO AME\n\nNessun dato disponibile. Inserire almeno un record con parametri clinici per ottenere raccomandazioni terapeutiche personalizzate.\n\n⚠️ ATTENZIONE: Questo algoritmo segue le linee guida AME (Associazione Medici Endocrinologi) e deve essere utilizzato solo da personale medico qualificato.");
			return;
		}

		// ===== ANALISI PREDITTIVA PERSONALIZZATA ===== //
		const currentData = {
			acth: records[records.length - 1].acth,
			units: units,
			currentTherapy: currentTherapy
		};

		const predictiveResult = generatePredictiveAnalysis(currentData, currentPatient);
		setPredictiveAnalysis(predictiveResult);

		// ===== SMART NOTIFICATIONS SYSTEM ===== //
		const notifications = [];
		if (currentPatient && learningMode) {
			// Learning-based notifications
			if (predictiveResult.confidence > 80) {
				notifications.push("🎯 Alta affidabilità della previsione AI - Raccomandazione altamente personalizzata");
			}
			if (currentPatient.responsePatterns.stabilityScore < 50) {
				notifications.push("📊 Pattern instabile rilevato - Considerare monitoraggio più frequente");
			}
			if (currentPatient.therapyHistory.length > 5) {
				notifications.push("🧠 Modello maturo - Precisione predittiva ottimizzata");
			}
			if (predictiveResult.expectedOutcome.qolImprovement > 20) {
				notifications.push("✨ Miglioramento significativo della qualità di vita previsto");
			}
		}
		setSmartNotifications(notifications);

		// Auto-import da documenti se disponibili
		if (uploadedDocuments.length > 0) {
			const recentDoc = uploadedDocuments[uploadedDocuments.length - 1];
			if (recentDoc.extractedData && Object.keys(recentDoc.extractedData).length > 0) {
				notifications.push("📄 Dati clinici importati automaticamente da: " + recentDoc.fileName);
			}
		}
		setSmartNotifications(notifications);

		const r = records[records.length - 1];
		let recommendations = [];
		let alerts = [];
		let emergencyActions = [];

		// ===== VALUTAZIONE PARAMETRI CLINICI ===== //

		// Elettroliti
		const hyponatremia = r.na !== null && r.na !== undefined && r.na < 135;
		const hypernatremia = r.na !== null && r.na !== undefined && r.na > 145;
		const hypokaliemia = r.k !== null && r.k !== undefined && r.k < 3.5;
		const hyperkaliemia = r.k !== null && r.k !== undefined && r.k > 5.0;

		// Ormoni
		const elevatedACTH = r.acth !== null && r.acth !== undefined && r.acth > 145;
		const lowCortisol = r.cortisol !== null && r.cortisol !== undefined && r.cortisol < 6;
		const elevatedRenin = r.renin !== null && r.renin !== undefined && r.renin > 4.0;

		// Pressione arteriosa
		const hypotension = (r.bpSupSys !== null && r.bpSupSys !== undefined && r.bpSupSys < 100) ||
			(r.bpSupDia !== null && r.bpSupDia !== undefined && r.bpSupDia < 60);
		const hypertension = (r.bpSupSys !== null && r.bpSupSys !== undefined && r.bpSupSys >= 140) ||
			(r.bpSupDia !== null && r.bpSupDia !== undefined && r.bpSupDia >= 90);
		const orthostaticHypotension = (r.bpSupSys !== null && r.bpOrthSys !== null &&
			r.bpSupSys !== undefined && r.bpOrthSys !== undefined &&
			(r.bpSupSys - r.bpOrthSys) >= 20);

		// Sintomi clinici
		const saltCraving = r.craveSalt;
		const vertigo = r.vertigo;

		// ===== IDENTIFICAZIONE CRISI SURRENALICA ===== //
		let crisisRisk = false;
		if (hyponatremia && hyperkaliemia && hypotension) {
			crisisRisk = true;
			emergencyActions.push("🚨 POSSIBILE CRISI SURRENALICA");
			emergencyActions.push("• AZIONE IMMEDIATA: Flebocortid 100mg IM");
			emergencyActions.push("• Trasferimento urgente in Pronto Soccorso");
			emergencyActions.push("• Idratazione con soluzione fisiologica");
			emergencyActions.push("• Monitoraggio continuo parametri vitali");
		}

		// ===== RACCOMANDAZIONI TERAPIA GLUCOCORTICOIDE ===== //
		let currentDose = currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening;
		let recommendedDose = currentDose;
		let dosageReason = "";
		let erHcRecommendation = "";

		// Valutazione candidatura per ER-HC (basata su evidenze 2024-2025)
		const erHcCandidate = hypertension || hypokaliemia || (currentDose > 25) ||
			(elevatedACTH && lowCortisol) || vertigo;

		if (erHcCandidate) {
			erHcRecommendation = `
💊 FORMULAZIONI A RILASCIO PROLUNGATO (ER-HC):
• PLENADREN: monosomministrazione mattutina
  - Riduce peso corporeo (-1-2kg), pressione arteriosa (-5mmHg sistolica)
  - Migliora HbA1c (-0.3-0.6%), qualità di vita
  - Dose equivalente: ${Math.round(currentDose * 0.8 * 4) / 4}mg (riduzione 20% per minore esposizione)
  
• EFMODY: doppia somministrazione (sera + mattina)
  - Mimetic ritmo circadiano naturale
  - 2/3 dose ore 23:00, 1/3 dose ore 07:00
  - Particolarmente indicato se astenia mattutina
  
⚠️ CONSIDERAZIONI:
• Costo maggiore vs. terapia convenzionale
• Necessari comunque HC/CA per situazioni di stress
• Controindicati in malassorbimento o transito rapido`;
		}

		// Funzioni per gestione dosi in quarti di compressa
		const roundToQuarter = (dose: number) => Math.round(dose * 4) / 4;

		const distributeDoseInQuarters = (totalDose: number, ratios: number[]) => {
			// Calcola le dosi teoriche
			const theoreticalDoses = ratios.map(ratio => totalDose * ratio);

			// Arrotonda ogni dose al quarto più vicino
			let roundedDoses = theoreticalDoses.map(dose => roundToQuarter(dose));

			// Verifica che la somma corrisponda alla dose totale
			let actualTotal = roundedDoses.reduce((sum, dose) => sum + dose, 0);
			let difference = roundToQuarter(totalDose - actualTotal);

			// Aggiusta la dose più grande se c'è una differenza
			if (Math.abs(difference) >= 0.25) {
				const maxIndex = roundedDoses.indexOf(Math.max(...roundedDoses));
				roundedDoses[maxIndex] = roundToQuarter(roundedDoses[maxIndex] + difference);
			}

			return roundedDoses;
		};

		// Analisi necessità aumento dose (incrementi di 6.25mg = 1/4 + 1/4 di compressa)
		if (elevatedACTH || lowCortisol || hyponatremia) {
			recommendedDose = Math.min(roundToQuarter(currentDose + 6.25), 50); // Max 50mg secondo linee guida
			dosageReason = "↗️ Aumento dose per ACTH elevato/cortisolo basso/iponatremia";
		} else if (hypertension && !hypokaliemia) {
			recommendedDose = Math.max(roundToQuarter(currentDose - 6.25), 15); // Min 15mg secondo linee guida
			dosageReason = "↘️ Riduzione dose per ipertensione ben controllata";
		} else {
			// Se nessuna modifica necessaria, assicuriamoci che la dose attuale sia comunque arrotondata
			recommendedDose = roundToQuarter(currentDose);
		}

		// Schema posologico ottimale garantendo quarti di compressa
		let morningDose, middayDose, eveningDose;
		if (recommendedDose <= 25) {
			// Doppia somministrazione per dosi ≤25mg
			const doses = distributeDoseInQuarters(recommendedDose, [0.67, 0.33]);
			morningDose = doses[0];  // 2/3 della dose
			middayDose = doses[1];   // 1/3 della dose  
			eveningDose = 0;
		} else {
			// Tripla somministrazione per dosi >25mg
			const doses = distributeDoseInQuarters(recommendedDose, [0.5, 0.3, 0.2]);
			morningDose = doses[0];  // 50%
			middayDose = doses[1];   // 30%
			eveningDose = doses[2];  // 20%
		}

		// ===== RACCOMANDAZIONI TERAPIA MINERALCORTICOIDE ===== //
		let fludroRecommendation = currentTherapy.florinef;
		let fludroReason = "Mantieni dosaggio attuale";

		if (hyponatremia || elevatedRenin || orthostaticHypotension || saltCraving) {
			fludroRecommendation = Math.min(currentTherapy.florinef + 0.025, 0.2);
			fludroReason = "↗️ Aumento per iponatremia/renina elevata/ipotensione ortostatica";
		} else if (hypertension || hypokaliemia) {
			fludroRecommendation = Math.max(currentTherapy.florinef - 0.025, 0.05);
			fludroReason = "↘️ Riduzione per ipertensione/ipokaliemia";
		}

		// ===== MONITORAGGIO E CONTROLLI ===== //
		let monitoring = [];
		if (recommendedDose !== currentDose || fludroRecommendation !== currentTherapy.florinef) {
			monitoring.push("📅 Ricontrollo elettroliti in 2-4 settimane");
			monitoring.push("📅 Rivalutazione ACTH e cortisolo in 6-8 settimane");
			monitoring.push("📅 Controllo pressione arteriosa settimanale");
		}
		if (elevatedRenin || fludroRecommendation !== currentTherapy.florinef) {
			monitoring.push("📅 Controllo renina in 4-6 settimane");
		}

		// ===== GESTIONE STRESS E SITUAZIONI SPECIALI ===== //
		let stressProtocols = [
			"🌡️ FEBBRE E INFEZIONI (evidenze 2024-2025):",
			"  • 37.5-38°C: dose extra +50% per 24-48h",
			"  • >38°C: raddoppiare dose per 48-72h",
			"  • >38.5°C + prostrazione: Flebocortid 50-100mg IM",
			"  • Sepsi/infezioni gravi: 200-300mg/die HC ev per 48-72h",
			"",
			"🤢 DISTURBI GASTROINTESTINALI:",
			"  • Vomito <2h da assunzione: ripetere dose",
			"  • Vomito persistente: Flebocortid 100mg IM stat",
			"  • Diarrea grave (>6 scariche): +100mg HC per os + monitorare elettroliti",
			"  • Impossibilità terapia orale >6h = EMERGENZA",
			"",
			"🏥 PROCEDURE MEDICHE E CHIRURGICHE:",
			"  • Anestesia locale/procedure minori: dose normale",
			"  • Endoscopie, biopsie: doppia dose orale 2h prima",
			"  • Chirurgia minore: 50-75mg HC IM pre-operatorio",
			"  • Chirurgia maggiore: 100-150mg HC IM + 200-300mg/24h ev",
			"  • Terapia intensiva: 200-400mg/24h HC ev in infusione continua",
			"",
			"🧠 STRESS PSICOFISICO (nuove evidenze):",
			"  • Stress emotivo intenso: +25-50% dose per 24-48h",
			"  • Attività fisica intensa (>60min): +5-10mg HC pre-attività",
			"  • Viaggi lunghi/jet lag: mantenere orari originali per 48h",
			"  • Esami medici stressanti (RM, TAC): +10mg HC 2h prima",
			"",
			"💊 INTERAZIONI FARMACOLOGICHE (aggiornate 2024):",
			"  • Induttori CYP3A4 (fenitoina, carbamazepina, rifampicina): ↗️ dose GC +25-50%",
			"  • Inibitori CYP3A4 (ritonavir, claritromicina, itraconazolo): ↘️ dose GC -25%",
			"  • Diuretici, ACE-inibitori: monitorare elettroliti settimanalmente",
			"  • Anti-coagulanti: monitorare INR (possibile potenziamento)",
			"  • Vaccini vivi: evitare se dose >20mg/die HC equivalente"
		];

		// ===== VALUTAZIONE QUALITÀ DELLA VITA (AddiQoL) ===== //
		let qolRecommendations = [];
		let qolScore = 0;
		let qolCount = 0;

		// Calcolo punteggio AddiQoL medio
		const qolParams = [r.fatigue, r.moodChanges, r.workCapacity, r.socialLife,
		r.sleepQuality, r.physicalAppearance, r.overallWellbeing, r.treatmentSatisfaction];

		qolParams.forEach(param => {
			if (param !== null && param !== undefined) {
				qolScore += param;
				qolCount++;
			}
		});

		const avgQoLScore = qolCount > 0 ? qolScore / qolCount : null;

		if (avgQoLScore !== null) {
			qolRecommendations.push("💭 ANALISI QUALITÀ DELLA VITA (AddiQoL):");
			qolRecommendations.push(`📊 Punteggio medio: ${avgQoLScore.toFixed(1)}/5.0 (${qolCount}/8 domini valutati)`);

			if (avgQoLScore < 2.5) {
				qolRecommendations.push("🔴 QoL CRITICA - Intervento immediato necessario:");
				qolRecommendations.push("  • Revisione completa schema terapeutico");
				qolRecommendations.push("  • Candidato PRIORITARIO per ER-HC (Plenadren/Efmody)");
				qolRecommendations.push("  • Valutazione supporto psicologico");
				qolRecommendations.push("  • Follow-up ravvicinato (2-4 settimane)");
				erHcRecommendation = erHcRecommendation || "FORTE raccomandazione per formulazioni ER-HC data la scarsa QoL";
			} else if (avgQoLScore < 3.5) {
				qolRecommendations.push("🟡 QoL SUBOTTIMALE - Ottimizzazione terapeutica:");
				qolRecommendations.push("  • Considerare aggiustamento posologia");
				qolRecommendations.push("  • Valutazione candidatura ER-HC");
				qolRecommendations.push("  • Controllo aderenza terapeutica");
				qolRecommendations.push("  • Follow-up in 6-8 settimane");
			} else if (avgQoLScore >= 4.0) {
				qolRecommendations.push("� QoL BUONA - Mantenimento terapia:");
				qolRecommendations.push("  • Schema terapeutico efficace");
				qolRecommendations.push("  • Mantenere dosaggi attuali");
				qolRecommendations.push("  • Follow-up standard (3-6 mesi)");
			} else {
				qolRecommendations.push("🟠 QoL ACCETTABILE - Monitoraggio:");
				qolRecommendations.push("  • Possibilità di ottimizzazione");
				qolRecommendations.push("  • Valutare fattori aggravanti");
				qolRecommendations.push("  • Follow-up in 8-12 settimane");
			}

			// Analisi domini specifici
			const criticalDomains = [];
			if (r.fatigue && r.fatigue <= 2) criticalDomains.push("Energia");
			if (r.moodChanges && r.moodChanges <= 2) criticalDomains.push("Umore");
			if (r.workCapacity && r.workCapacity <= 2) criticalDomains.push("Lavoro");
			if (r.socialLife && r.socialLife <= 2) criticalDomains.push("Socialità");
			if (r.sleepQuality && r.sleepQuality <= 2) criticalDomains.push("Sonno");
			if (r.treatmentSatisfaction && r.treatmentSatisfaction <= 2) criticalDomains.push("Terapia");

			if (criticalDomains.length > 0) {
				qolRecommendations.push(`⚠️ Domini critici (≤2/5): ${criticalDomains.join(", ")}`);
			}
		}

		// Integrazione con sintomi fisici
		if (vertigo || saltCraving || orthostaticHypotension) {
			qolRecommendations.push("🔍 CORRELAZIONE SINTOMI-QoL:");
			qolRecommendations.push("  • Sintomi fisici influenzano negativamente la QoL");
			qolRecommendations.push("  • Ottimizzazione terapia mineralcorticoide indicata");
		}

		if (hypertension || hypokaliemia) {
			qolRecommendations.push("🔍 CORRELAZIONE SINTOMI-QoL:");
			qolRecommendations.push("  • Possibili eventi Cushingoidi subclinic");
			qolRecommendations.push("  • Riduzione graduale dose può migliorare QoL");
		}

		// ===== ALERT E AVVERTENZE ===== //
		if (hyponatremia && hyperkaliemia) {
			alerts.push("⚠️ ALERT: Squilibrio elettrolitico significativo - considerare aumento terapia");
		}
		if (hypotension) {
			alerts.push("⚠️ ALERT: Ipotensione rilevata - valutare adeguatezza terapia mineralcorticoide");
		}
		if (hypertension && hypokaliemia && currentDose > 30) {
			alerts.push("⚠️ ALERT: Possibile sovra-dosaggio - valutare riduzione graduale");
		}
		if (elevatedACTH && lowCortisol) {
			alerts.push("⚠️ ALERT: Controllo inadeguato - considerare ottimizzazione terapia");
		}
		if (saltCraving || vertigo) {
			alerts.push("⚠️ ALERT: Sintomi suggestivi di ipoaldosteronismo - valutare fludrocortisone");
		}

		// ===== COMPOSIZIONE RACCOMANDAZIONI FINALI ===== //
		let finalRecommendation = [];

		finalRecommendation.push("📋 ADDIDOSE++ ALGORITMO AME - RACCOMANDAZIONI CLINICHE");
		finalRecommendation.push("=".repeat(60));

		if (emergencyActions.length > 0) {
			finalRecommendation.push("");
			finalRecommendation.push("🚨 EMERGENZA MEDICA");
			finalRecommendation.push("-".repeat(20));
			finalRecommendation = finalRecommendation.concat(emergencyActions);
		}

		finalRecommendation.push("");
		finalRecommendation.push("💊 TERAPIA GLUCOCORTICOIDE");
		finalRecommendation.push("-".repeat(30));
		finalRecommendation.push(`Dose attuale: ${currentDose} mg/die`);
		finalRecommendation.push(`Dose raccomandata: ${recommendedDose} mg/die`);
		if (dosageReason) finalRecommendation.push(`Motivazione: ${dosageReason}`);
		finalRecommendation.push("");
		finalRecommendation.push("Schema posologico ottimale:");
		finalRecommendation.push(`• Mattina (07:30): ${morningDose} mg`);
		finalRecommendation.push(`• Mezzogiorno (12:30): ${middayDose} mg`);
		if (eveningDose > 0) finalRecommendation.push(`• Sera (17:30): ${eveningDose} mg`);

		// Conversione in quarti di compressa per praticità
		const convertToQuarters = (dose: number) => {
			const quarters = dose / 6.25; // 25mg compressa = 4 quarti
			if (quarters === Math.floor(quarters)) {
				return quarters === 1 ? "1/4 compressa" : quarters === 2 ? "1/2 compressa" :
					quarters === 3 ? "3/4 compressa" : quarters === 4 ? "1 compressa" :
						`${Math.floor(quarters / 4)} cpr + ${quarters % 4}/4`;
			}
			return `${quarters.toFixed(2)} quarti`;
		};

		finalRecommendation.push("");
		finalRecommendation.push("💊 CONVERSIONE PRATICA (25mg = 1 compressa):");
		finalRecommendation.push(`• Mattina: ${morningDose}mg = ${convertToQuarters(morningDose)}`);
		finalRecommendation.push(`• Mezzogiorno: ${middayDose}mg = ${convertToQuarters(middayDose)}`);
		if (eveningDose > 0) finalRecommendation.push(`• Sera: ${eveningDose}mg = ${convertToQuarters(eveningDose)}`);
		finalRecommendation.push("⚠️ Le compresse possono essere divise SOLO in quarti (6.25mg)");

		finalRecommendation.push("");
		finalRecommendation.push("🧂 TERAPIA MINERALCORTICOIDE");
		finalRecommendation.push("-".repeat(30));
		finalRecommendation.push(`Florinef attuale: ${currentTherapy.florinef} mg/die`);
		finalRecommendation.push(`Florinef raccomandato: ${fludroRecommendation} mg/die`);
		finalRecommendation.push(`Motivazione: ${fludroReason}`);

		if (alerts.length > 0) {
			finalRecommendation.push("");
			finalRecommendation.push("⚠️ ALERT CLINICI");
			finalRecommendation.push("-".repeat(20));
			finalRecommendation = finalRecommendation.concat(alerts);
		}

		if (erHcRecommendation) {
			finalRecommendation.push("");
			finalRecommendation.push("🔬 FORMULAZIONI AVANZATE (ER-HC)");
			finalRecommendation.push("-".repeat(35));
			finalRecommendation.push(erHcRecommendation);
		}

		if (qolRecommendations.length > 0) {
			finalRecommendation.push("");
			finalRecommendation.push("💭 VALUTAZIONE QUALITÀ DELLA VITA");
			finalRecommendation.push("-".repeat(35));
			finalRecommendation = finalRecommendation.concat(qolRecommendations);
		}

		if (monitoring.length > 0) {
			finalRecommendation.push("");
			finalRecommendation.push("📅 MONITORAGGIO");
			finalRecommendation.push("-".repeat(15));
			finalRecommendation = finalRecommendation.concat(monitoring);
		}

		finalRecommendation.push("");
		finalRecommendation.push("📚 PROTOCOLLI GESTIONE STRESS (aggiornati 2024-2025)");
		finalRecommendation.push("-".repeat(45));
		finalRecommendation = finalRecommendation.concat(stressProtocols);

		finalRecommendation.push("");
		finalRecommendation.push("⚠️ DISCLAIMER");
		finalRecommendation.push("-".repeat(15));
		finalRecommendation.push("Algoritmo basato su linee guida AME 2023 e letteratura 2024-2025");
		finalRecommendation.push("(JCEM 2025, evidenze ER-HC, protocolli stress aggiornati).");
		finalRecommendation.push("Le raccomandazioni sono indicative e devono essere");
		finalRecommendation.push("sempre valutate dal medico specialista in relazione");
		finalRecommendation.push("al quadro clinico completo del paziente.");
		finalRecommendation.push("");
		finalRecommendation.push("🔬 EVIDENZE SCIENTIFICHE:");
		finalRecommendation.push("• ER-HC riducono peso (-1-2kg), PA (-5mmHg), HbA1c (-0.3-0.6%)");
		finalRecommendation.push("• Miglioramento qualità vita (AddiQoL +4 punti)");
		finalRecommendation.push("• Plenadren: -20% esposizione cortisolo vs IR-HC");
		finalRecommendation.push("• Efmody: ripristina ritmo circadiano fisiologico");
		finalRecommendation.push("");
		// ===== ENHANCED RECOMMENDATIONS CON AI ===== //
		if (currentPatient && predictiveResult.confidence > 70) {
			finalRecommendation.push("\n🧠 RACCOMANDAZIONI PERSONALIZZATE (AI-Enhanced):");
			finalRecommendation.push(`• Dose ottimale predetta: ${predictiveResult.recommendedDose}mg/die`);
			finalRecommendation.push(`• Confidence: ${predictiveResult.confidence}%`);
			finalRecommendation.push(`• Distribuzione suggerita: ${currentPatient.responsePatterns.optimalDistribution.join('%-')}%`);

			if (predictiveResult.expectedOutcome.acthImprovement > 50) {
				finalRecommendation.push(`• Miglioramento ACTH atteso: ${Math.round(predictiveResult.expectedOutcome.acthImprovement)}%`);
			}

			if (predictiveResult.riskFactors.length > 0) {
				finalRecommendation.push("⚠️ Fattori di rischio: " + predictiveResult.riskFactors.join(", "));
			}
		}

		finalRecommendation.push("\n📞 In caso di dubbi o emergenze:");
		finalRecommendation.push("• Contattare endocrinologo di riferimento");
		finalRecommendation.push("• Emergenze: 118");
		finalRecommendation.push("• AiPAd: associazione@aipai.it");

		setSuggestion(finalRecommendation.join("\n"));

		// ===== AGGIORNAMENTO TERAPIA PROPOSTA (Enhanced) ===== //
		const enhancedMorningDose = currentPatient && predictiveResult.confidence > 70 ?
			(predictiveResult.recommendedDose * currentPatient.responsePatterns.optimalDistribution[0] / 100) : morningDose;
		const enhancedMiddayDose = currentPatient && predictiveResult.confidence > 70 ?
			(predictiveResult.recommendedDose * currentPatient.responsePatterns.optimalDistribution[1] / 100) : middayDose;
		const enhancedEveningDose = currentPatient && predictiveResult.confidence > 70 ?
			(predictiveResult.recommendedDose * currentPatient.responsePatterns.optimalDistribution[2] / 100) : eveningDose;

		setProposedTherapy({
			cortisoneAcetate: {
				morning: Math.round(enhancedMorningDose * 4) / 4,
				midday: Math.round(enhancedMiddayDose * 4) / 4,
				evening: Math.round(enhancedEveningDose * 4) / 4
			},
			florinef: fludroRecommendation
		});
	}

	const upperRenin = () => 4;
	const lowerRenin = () => 0.3; // placeholder

	// Funzione per applicare la terapia proposta
	function applyProposedTherapy() {
		if (proposedTherapy) {
			setCurrentTherapy(proposedTherapy);
			setEditingTherapy(proposedTherapy);
			setProposedTherapy(null); // Reset della proposta dopo applicazione
			setSuggestion("✅ Terapia aggiornata con successo! Eseguire nuovamente l'algoritmo per nuove valutazioni.");
		}
	}

	// Funzione di validazione per dosi in quarti
	function validateQuarterDoses(therapy: CurrentTherapy): string[] {
		const errors: string[] = [];
		const roundToQuarter = (dose: number) => Math.round(dose * 4) / 4;

		// Valida cortisone acetato
		const { morning, midday, evening } = therapy.cortisoneAcetate;
		if (morning !== roundToQuarter(morning)) {
			errors.push(`Dose mattutina ${morning}mg non è un quarto valido. Suggerito: ${roundToQuarter(morning)}mg`);
		}
		if (midday !== roundToQuarter(midday)) {
			errors.push(`Dose mezzogiorno ${midday}mg non è un quarto valido. Suggerito: ${roundToQuarter(midday)}mg`);
		}
		if (evening !== roundToQuarter(evening)) {
			errors.push(`Dose serale ${evening}mg non è un quarto valido. Suggerito: ${roundToQuarter(evening)}mg`);
		}

		const totalDose = morning + midday + evening;
		if (totalDose < 15) {
			errors.push("Dose totale troppo bassa (<15mg/die). Rischio crisi surrenalica.");
		}
		if (totalDose > 50) {
			errors.push("Dose totale troppo alta (>50mg/die). Rischio effetti Cushingoidi.");
		}

		return errors;
	}

	// Funzioni per gestire l'editing della terapia
	function startEditingTherapy() {
		setEditingTherapy({ ...currentTherapy });
		setTherapyErrors([]);
		setIsEditingTherapy(true);
	}

	function cancelEditingTherapy() {
		setEditingTherapy({ ...currentTherapy });
		setTherapyErrors([]);
		setIsEditingTherapy(false);
	}

	function saveTherapyChanges() {
		const errors = validateTherapyValues(editingTherapy);

		if (errors.length > 0) {
			setTherapyErrors(errors);
			return; // Non salvare se ci sono errori
		}

		setCurrentTherapy({ ...editingTherapy });
		setTherapyErrors([]);
		setIsEditingTherapy(false);
		setSuggestion("✅ Modifiche alla terapia salvate! Eseguire nuovamente l'algoritmo per aggiornare le raccomandazioni.");
	}

	function updateEditingTherapy(field: string, value: number) {
		let newTherapy: CurrentTherapy;

		if (field === 'florinef') {
			newTherapy = { ...editingTherapy, florinef: value };
		} else if (field in editingTherapy.cortisoneAcetate) {
			newTherapy = {
				...editingTherapy,
				cortisoneAcetate: {
					...editingTherapy.cortisoneAcetate,
					[field]: value
				}
			};
		} else {
			return; // Campo non riconosciuto
		}

		setEditingTherapy(newTherapy);

		// Validazione real-time (solo warning, non blocca l'input)
		const errors = validateTherapyValues(newTherapy);
		setTherapyErrors(errors);
	}

	// Funzione per aggiornamento automatico della terapia corrente
	function updateCurrentTherapy(field: string, value: number) {
		let newTherapy: CurrentTherapy;

		if (field === 'florinef') {
			newTherapy = { ...currentTherapy, florinef: value };
		} else if (field in currentTherapy.cortisoneAcetate) {
			newTherapy = {
				...currentTherapy,
				cortisoneAcetate: {
					...currentTherapy.cortisoneAcetate,
					[field]: value
				}
			};
		} else {
			return; // Campo non riconosciuto
		}

		setCurrentTherapy(newTherapy);

		// Validazione real-time (solo warning, non blocca l'input)
		const errors = validateTherapyValues(newTherapy);
		setTherapyErrors(errors);
	}

	// Funzione per auto-correggere le dosi ai quarti più vicini
	function autoCorrectToQuarters() {
		const roundToQuarter = (dose: number) => Math.round(dose * 4) / 4;

		const correctedTherapy: CurrentTherapy = {
			cortisoneAcetate: {
				morning: roundToQuarter(currentTherapy.cortisoneAcetate.morning),
				midday: roundToQuarter(currentTherapy.cortisoneAcetate.midday),
				evening: roundToQuarter(currentTherapy.cortisoneAcetate.evening)
			},
			florinef: currentTherapy.florinef
		};

		setCurrentTherapy(correctedTherapy);

		// Re-valida dopo la correzione
		const errors = validateTherapyValues(correctedTherapy);
		setTherapyErrors(errors);

		setSuggestion("🔧 Dosi auto-corrette ai quarti più vicini. Verificare che siano appropriate clinicamente.");
	}

	// ===== UI ===== //
	return (
		<div className="min-h-screen bg-gray-50 flex flex-col">
			<header className="bg-white shadow p-4 flex justify-between items-center">
				<div className="flex items-center space-x-4">
					<h1 className="text-2xl font-semibold">Addison Care • v3.0</h1>
					{currentPatient && (
						<div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
							<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
							<span className="text-sm font-medium">{currentPatient.firstName} {currentPatient.lastName}</span>
							{predictiveAnalysis && (
								<span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
									AI: {predictiveAnalysis.confidence}%
								</span>
							)}
						</div>
					)}
				</div>
				<div className="flex items-center space-x-4">
				</div>
			</header>

			<main className="flex-1 p-6 grid lg:grid-cols-4 gap-4">
				{/* Quick Actions card */}
				<Card className="lg:col-span-1 h-fit">
					<CardContent className="space-y-4 p-4">
						<h2 className="font-medium">Azioni rapide</h2>

						<div className="space-y-2">
							<Button
								onClick={() => setShowNewRecordForm(true)}
								className="w-full bg-blue-600 hover:bg-blue-700"
							>
								➕ Nuovo record
							</Button>
							<Button
								onClick={runAlgorithm}
								className={`w-full ${currentPatient ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' : 'bg-gray-600 hover:bg-gray-700'}`}
							>
								{currentPatient ? (
									<div className="flex items-center justify-center gap-2">
										<span>🧠 Esegui AI Algorithm</span>
										<div className="flex gap-1">
											<div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
											<div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
											<div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
										</div>
									</div>
								) : (
									'🤖 Esegui algoritmo standard'
								)}
							</Button>
							{proposedTherapy && (
								<Button
									onClick={applyProposedTherapy}
									className="w-full bg-green-600 hover:bg-green-700"
									variant="default"
								>
									✅ Applica terapia proposta
								</Button>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Main Content Tabs */}
				<Tabs defaultValue="records" className="lg:col-span-3 flex flex-col">
					<TabsList className="self-start grid w-full grid-cols-8">
						<TabsTrigger value="records">Records</TabsTrigger>
						<TabsTrigger value="patient">� Paziente</TabsTrigger>
						<TabsTrigger value="ai-insights">🧠 AI Insights</TabsTrigger>
						<TabsTrigger value="qol">💭 QoV</TabsTrigger>
						<TabsTrigger value="terapia">Terapia</TabsTrigger>
						<TabsTrigger value="piano">Piano</TabsTrigger>
						<TabsTrigger value="kit">Kit</TabsTrigger>
						<TabsTrigger value="riferimenti">Rif.</TabsTrigger>
					</TabsList>

					<TabsContent value="records" className="mt-4">
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
							<Card>
								<CardHeader>
									<CardTitle>Dati laboratorio</CardTitle>
								</CardHeader>
								<CardContent>
									<Table className="text-xs">
										<TableHeader>
											<TableRow>
												<TableHead>Data</TableHead>
												<TableHead>Na</TableHead>
												<TableHead>K</TableHead>
												<TableHead>ACTH</TableHead>
												<TableHead>Cort</TableHead>
												<TableHead>Renina</TableHead>
												<TableHead>PA sup sys</TableHead>
												<TableHead>PA sup dia</TableHead>
												<TableHead>PA ort sys</TableHead>
												<TableHead>PA ort dia</TableHead>
												<TableHead>Sale</TableHead>
												<TableHead>Vert</TableHead>
												<TableHead>QoL Score</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{records.map((r, i) => (
												<TableRow key={i}>
													<TableCell>{r.date}</TableCell>
													<TableCell>{displayValue(r.na, 'na')}</TableCell>
													<TableCell>{displayValue(r.k, 'k')}</TableCell>
													<TableCell>{displayValue(r.acth, 'acth')}</TableCell>
													<TableCell>{displayValue(r.cortisol, 'cortisol')}</TableCell>
													<TableCell>{displayValue(r.renin, 'renin')}</TableCell>
													<TableCell>{displayValue(r.bpSupSys, 'bp')}</TableCell>
													<TableCell>{displayValue(r.bpSupDia, 'bp')}</TableCell>
													<TableCell>{displayValue(r.bpOrthSys, 'bp')}</TableCell>
													<TableCell>{displayValue(r.bpOrthDia, 'bp')}</TableCell>
													<TableCell>{r.craveSalt ? "Sì" : "No"}</TableCell>
													<TableCell>{r.vertigo ? "Sì" : "No"}</TableCell>
													<TableCell>
														{(() => {
															const qolParams = [r.fatigue, r.moodChanges, r.workCapacity, r.socialLife,
															r.sleepQuality, r.physicalAppearance, r.overallWellbeing, r.treatmentSatisfaction];
															const validParams = qolParams.filter(p => p !== null && p !== undefined);
															if (validParams.length === 0) return "-";
															const avg = validParams.reduce((a, b) => a + b, 0) / validParams.length;
															const color = avg < 2.5 ? "text-red-600" : avg < 3.5 ? "text-yellow-600" : "text-green-600";
															return <span className={color}>{avg.toFixed(1)}/5</span>;
														})()}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</CardContent>
							</Card>
						</motion.div>
					</TabsContent>

					<TabsContent value="patient" className="mt-4">
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										👤 Gestione Paziente
										<div className="ml-auto flex gap-2">
											<Button
												size="sm"
												onClick={() => setShowImportDialog(true)}
												className="bg-green-600 hover:bg-green-700"
											>
												📄 Importa Documenti
											</Button>
											{currentPatient && (
												<Button
													size="sm"
													onClick={() => setShowPatientDialog(true)}
													variant="outline"
												>
													✏️ Modifica Paziente
												</Button>
											)}
										</div>
									</CardTitle>
								</CardHeader>
								<CardContent>
									{/* Patient Selector */}
									<div className="mb-6 p-4 bg-gray-50 rounded-lg">
										<div className="flex items-center justify-between mb-4">
											<h3 className="text-sm font-medium">Gestione Pazienti</h3>
											<Button
												size="sm"
												onClick={() => setShowPatientDialog(true)}
												className="bg-blue-600 hover:bg-blue-700 text-white"
											>
												➕ Aggiungi Nuovo Paziente
											</Button>
										</div>

										{patients.length > 0 && (
											<div className="space-y-3">
												{/* Dynamic Patient Search */}
												<div className="relative">
													<label className="block text-xs font-medium text-gray-600 mb-1">
														🔍 Cerca e seleziona paziente
													</label>
													<Input
														type="text"
														placeholder={currentPatient ? `${currentPatient.firstName} ${currentPatient.lastName}` : "Digita per cercare pazienti..."}
														value={patientSearchTerm}
														onChange={(e) => {
															setPatientSearchTerm(e.target.value);
															setShowPatientSuggestions(true);
														}}
														onFocus={() => setShowPatientSuggestions(true)}
														onBlur={() => setTimeout(() => setShowPatientSuggestions(false), 200)}
														className="w-full"
													/>

													{/* Current Patient Display */}
													{currentPatient && !patientSearchTerm && (
														<div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
															<div className="flex items-center justify-between">
																<div>
																	<div className="font-medium text-blue-900">
																		{currentPatient.firstName} {currentPatient.lastName}
																	</div>
																	<div className="text-xs text-blue-700">
																		{currentPatient.demographics.age} anni • {currentPatient.demographics.sex === 'M' ? 'Maschio' : 'Femmina'} • {currentPatient.demographics.diagnosis}
																	</div>
																</div>
																<button
																	onClick={() => {
																		setCurrentPatient(null);
																		setPatientSearchTerm('');
																	}}
																	className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-100"
																>
																	✕ Deseleziona
																</button>
															</div>
														</div>
													)}

													{/* Dynamic Suggestions Dropdown */}
													{showPatientSuggestions && (
														<div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
															{(patientSearchTerm ? filteredPatients : patients).length > 0 ? (
																<>
																	<div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b">
																		{patientSearchTerm ? (
																			<>{filteredPatients.length} paziente{filteredPatients.length !== 1 ? 'i' : ''} trovato{filteredPatients.length !== 1 ? 'i' : ''}</>
																		) : (
																			<>Tutti i pazienti ({patients.length})</>
																		)}
																	</div>
																	{(patientSearchTerm ? filteredPatients : patients).map((patient) => (
																		<div
																			key={patient.id}
																			onClick={() => {
																				setCurrentPatient(patient);
																				setPatientSearchTerm('');
																				setShowPatientSuggestions(false);
																			}}
																			className="px-3 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
																		>
																			<div className="flex items-center justify-between">
																				<div>
																					<div className="font-medium text-gray-900">
																						{patient.firstName} {patient.lastName}
																					</div>
																					<div className="text-sm text-gray-600">
																						{patient.demographics.age} anni • {patient.demographics.sex === 'M' ? 'M' : 'F'} • {patient.demographics.weight}kg
																					</div>
																					<div className="text-xs text-gray-500">
																						{patient.demographics.diagnosis}
																					</div>
																				</div>
																				<div className="text-xs text-gray-400">
																					{patient.therapyHistory.length} terapie
																				</div>
																			</div>
																		</div>
																	))}
																</>
															) : (
																<div className="px-3 py-4 text-center text-gray-500">
																	{patientSearchTerm ? (
																		<>
																			<div className="text-sm">Nessun paziente trovato</div>
																			<div className="text-xs mt-1">
																				Nessun risultato per "{patientSearchTerm}"
																			</div>
																		</>
																	) : (
																		<div className="text-sm">Nessun paziente registrato</div>
																	)}
																</div>
															)}
														</div>
													)}
												</div>
											</div>
										)}

										{patients.length === 0 && (
											<div className="text-center py-4 text-gray-500">
												<p className="text-sm">Nessun paziente registrato</p>
												<p className="text-xs mt-1">Clicca "Aggiungi Nuovo Paziente" per iniziare</p>
											</div>
										)}
									</div>
									{/* Documenti Importati */}
									{uploadedDocuments.length > 0 && (
										<div className="mb-6">
											<h4 className="font-medium mb-3 flex items-center gap-2">
												📚 Storia Clinica Importata ({uploadedDocuments.length})
												{isProcessingDoc && (
													<div className="flex items-center gap-2 text-sm text-blue-600">
														<div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
														Elaborazione... {importProgress}%
													</div>
												)}
											</h4>
											<div className="space-y-2 mb-4">
												{uploadedDocuments.slice(-3).map((doc) => (
													<div key={doc.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
														<div className="flex items-center gap-3">
															<div className={`w-2 h-2 rounded-full ${doc.processingStatus === 'completed' ? 'bg-green-500' :
																doc.processingStatus === 'processing' ? 'bg-yellow-500 animate-pulse' :
																	doc.processingStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
																}`}></div>
															<div>
																<p className="text-sm font-medium">{doc.fileName}</p>
																<p className="text-xs text-gray-500">
																	{new Date(doc.uploadDate).toLocaleString()} •
																	Confidence: {doc.confidence}% •
																	{Object.keys(doc.extractedData).length} campi estratti
																</p>
															</div>
														</div>
														<div className="text-xs text-gray-400">
															{doc.fileType.toUpperCase()}
														</div>
													</div>
												))}
											</div>
											{uploadedDocuments.length > 3 && (
												<p className="text-xs text-gray-500">
													...e altri {uploadedDocuments.length - 3} documenti
												</p>
											)}
										</div>
									)}

									{currentPatient ? (
										<div className="space-y-4">
											<div className="bg-blue-50 p-4 rounded-lg">
												<h3 className="font-semibold">{currentPatient.firstName} {currentPatient.lastName}</h3>
												<p className="text-sm text-gray-600">
													{currentPatient.demographics.age} anni • {currentPatient.demographics.sex === 'M' ? 'Maschio' : 'Femmina'} •
													{currentPatient.demographics.weight}kg • {currentPatient.demographics.height}cm
												</p>
												<p className="text-xs text-gray-500 mt-1">
													Diagnosi: {currentPatient.demographics.diagnosis} ({new Date(currentPatient.demographics.diagnosisDate).toLocaleDateString()})
												</p>
											</div>

											<div className="grid grid-cols-2 gap-4">
												<div>
													<h4 className="font-medium mb-2">Pattern di Risposta</h4>
													<div className="text-sm space-y-1">
														<div>Stabilità: {Math.round(currentPatient.responsePatterns.stabilityScore)}/100</div>
														<div>QoL media: {Math.round(currentPatient.responsePatterns.averageQoL)}/100</div>
														<div>Distribuzione ottimale: {currentPatient.responsePatterns.optimalDistribution.join('%-')}%</div>
													</div>
												</div>
												<div>
													<h4 className="font-medium mb-2">Storia Terapeutica</h4>
													<div className="text-sm">
														<div>{currentPatient.therapyHistory.length} episodi registrati</div>
														<Button
															size="sm"
															variant="outline"
															onClick={() => setShowTherapyHistory(true)}
															className="mt-2"
														>
															Visualizza Storia
														</Button>
													</div>
												</div>
											</div>

											{currentPatient.riskFactors.length > 0 && (
												<div className="bg-yellow-50 p-3 rounded-lg">
													<h4 className="font-medium text-yellow-800">Fattori di Rischio</h4>
													<ul className="text-sm text-yellow-700 mt-1">
														{currentPatient.riskFactors.map((risk, idx) => (
															<li key={idx}>• {risk}</li>
														))}
													</ul>
												</div>
											)}
										</div>
									) : (
										<div className="text-center py-8 text-gray-500">
											<p>Nessun paziente selezionato</p>
											<p className="text-sm mt-2">Crea un nuovo profilo paziente per abilitare l'analisi personalizzata</p>
										</div>
									)}
								</CardContent>
							</Card>
						</motion.div>
					</TabsContent>

					<TabsContent value="ai-insights" className="mt-4">
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										🧠 AI Insights & Predictive Analysis
									</CardTitle>
								</CardHeader>
								<CardContent>
									{predictiveAnalysis ? (
										<div className="space-y-4">
											<div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
												<div className="flex items-center justify-between mb-3">
													<h3 className="font-semibold">Analisi Predittiva</h3>
													<div className="bg-white px-3 py-1 rounded-full text-sm">
														Confidence: {predictiveAnalysis.confidence}%
													</div>
												</div>
												<div className="grid grid-cols-2 gap-4">
													<div>
														<p className="text-sm font-medium">Dose Raccomandata</p>
														<p className="text-lg font-bold text-blue-600">
															{predictiveAnalysis.recommendedDose}mg/die
														</p>
													</div>
													<div>
														<p className="text-sm font-medium">Outcome Atteso</p>
														<div className="text-sm space-y-1">
															<div>ACTH: +{Math.round(predictiveAnalysis.expectedOutcome.acthImprovement)}%</div>
															<div>QoL: +{Math.round(predictiveAnalysis.expectedOutcome.qolImprovement)}%</div>
														</div>
													</div>
												</div>
											</div>

											<div>
												<h4 className="font-medium mb-2">Reasoning Engine</h4>
												<ul className="text-sm space-y-1">
													{predictiveAnalysis.reasoning.map((reason, idx) => (
														<li key={idx} className="flex items-start gap-2">
															<span className="text-blue-500 mt-1">•</span>
															<span>{reason}</span>
														</li>
													))}
												</ul>
											</div>

											{predictiveAnalysis.riskFactors.length > 0 && (
												<div className="bg-red-50 p-3 rounded-lg">
													<h4 className="font-medium text-red-800">Fattori di Attenzione</h4>
													<ul className="text-sm text-red-700 mt-1">
														{predictiveAnalysis.riskFactors.map((risk, idx) => (
															<li key={idx}>⚠️ {risk}</li>
														))}
													</ul>
												</div>
											)}

											{/* Smart Notifications */}
											{smartNotifications.length > 0 && (
												<div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
													<div className="flex items-center justify-between mb-2">
														<h4 className="font-medium text-purple-800">🤖 Smart Notifications</h4>
														<div className="flex items-center gap-2">
															<span className="text-xs text-purple-600">Learning Mode</span>
															<div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
														</div>
													</div>
													<div className="space-y-2">
														{smartNotifications.map((notification, idx) => (
															<div key={idx} className="flex items-start gap-2 text-sm">
																<span className="text-purple-500 mt-0.5">•</span>
																<span className="text-purple-700">{notification}</span>
															</div>
														))}
													</div>
												</div>
											)}
										</div>
									) : (
										<div className="text-center py-8 text-gray-500">
											<p>Nessuna analisi disponibile</p>
											<p className="text-sm mt-2">Esegui l'algoritmo per generare insights personalizzati</p>
										</div>
									)}
								</CardContent>
							</Card>
						</motion.div>
					</TabsContent>

					<TabsContent value="qol" className="mt-4">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}
						>
							<Card>
								<CardHeader>
									<h2 className="text-xl font-bold text-blue-800">💭 Analisi Qualità della Vita (AddiQoL)</h2>
									<p className="text-sm text-gray-600">
										Valutazione basata su evidenze JCEM 2025 - Range normale AddiQoL: 85-120 punti
									</p>
								</CardHeader>
								<CardContent>
									{records.length > 0 && (() => {
										const latestRecord = records[records.length - 1];
										const qolParams = [
											{ name: 'Energia/Affaticamento', value: latestRecord.fatigue, icon: '😴' },
											{ name: 'Umore', value: latestRecord.moodChanges, icon: '🧠' },
											{ name: 'Capacità Lavorativa', value: latestRecord.workCapacity, icon: '💼' },
											{ name: 'Vita Sociale', value: latestRecord.socialLife, icon: '👥' },
											{ name: 'Qualità Sonno', value: latestRecord.sleepQuality, icon: '🛌' },
											{ name: 'Aspetto Fisico', value: latestRecord.physicalAppearance, icon: '🪞' },
											{ name: 'Benessere Generale', value: latestRecord.overallWellbeing, icon: '🌟' },
											{ name: 'Soddisfazione Terapia', value: latestRecord.treatmentSatisfaction, icon: '💊' }
										];

										const validParams = qolParams.filter(p => p.value !== null && p.value !== undefined);
										const avgScore = validParams.length > 0 ? validParams.reduce((a, b) => a + (b.value || 0), 0) / validParams.length : 0;
										const addiQoLScore = avgScore * 24; // Conversione a scala AddiQoL (120 punti max)

										return (
											<div className="space-y-6">
												{/* Punteggio Globale */}
												<div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
													<div className="text-center">
														<div className="text-3xl font-bold text-blue-800 mb-2">
															{avgScore.toFixed(1)}/5.0
														</div>
														<div className="text-lg text-blue-700 mb-1">
															AddiQoL Score: {addiQoLScore.toFixed(0)}/120
														</div>
														<div className={`text-sm font-medium ${avgScore >= 4.0 ? 'text-green-600' :
															avgScore >= 3.5 ? 'text-yellow-600' :
																avgScore >= 2.5 ? 'text-orange-600' : 'text-red-600'
															}`}>
															{avgScore >= 4.0 ? "🟢 Qualità di vita BUONA" :
																avgScore >= 3.5 ? "🟡 Qualità di vita ACCETTABILE" :
																	avgScore >= 2.5 ? "🟠 Qualità di vita SUBOTTIMALE" : "🔴 Qualità di vita CRITICA"}
														</div>
													</div>
												</div>

												{/* Dettaglio Domini */}
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													{qolParams.map((param, idx) => (
														<div key={idx} className="border rounded-lg p-3">
															<div className="flex items-center justify-between mb-2">
																<span className="font-medium text-gray-700">
																	{param.icon} {param.name}
																</span>
																<span className={`font-bold ${param.value === null || param.value === undefined ? 'text-gray-400' :
																	param.value <= 2 ? 'text-red-600' :
																		param.value <= 3 ? 'text-yellow-600' :
																			param.value <= 4 ? 'text-blue-600' : 'text-green-600'
																	}`}>
																	{param.value === null || param.value === undefined ? 'N/A' : `${param.value}/5`}
																</span>
															</div>
															{param.value !== null && param.value !== undefined && (
																<div className="w-full bg-gray-200 rounded-full h-2">
																	<div
																		className={`h-2 rounded-full ${param.value <= 2 ? 'bg-red-500' :
																			param.value <= 3 ? 'bg-yellow-500' :
																				param.value <= 4 ? 'bg-blue-500' : 'bg-green-500'
																			}`}
																		style={{ width: `${(param.value / 5) * 100}%` }}
																	></div>
																</div>
															)}
														</div>
													))}
												</div>

												{/* Trend e Raccomandazioni */}
												{records.length > 1 && (
													<div className="bg-gray-50 p-4 rounded-lg">
														<h3 className="font-bold text-gray-800 mb-3">📈 Trend Qualità della Vita</h3>
														<div className="text-sm text-gray-600">
															{(() => {
																const previousRecord = records[records.length - 2];
																const prevQolParams = [previousRecord.fatigue, previousRecord.moodChanges, previousRecord.workCapacity, previousRecord.socialLife,
																previousRecord.sleepQuality, previousRecord.physicalAppearance, previousRecord.overallWellbeing, previousRecord.treatmentSatisfaction];
																const prevValidParams = prevQolParams.filter(p => p !== null && p !== undefined);
																const prevAvgScore = prevValidParams.length > 0 ? prevValidParams.reduce((a, b) => a + b, 0) / prevValidParams.length : 0;
																const trend = avgScore - prevAvgScore;

																if (Math.abs(trend) < 0.1) {
																	return "🔄 Qualità della vita stabile rispetto alla rilevazione precedente";
																} else if (trend > 0) {
																	return `📈 Miglioramento di ${trend.toFixed(1)} punti rispetto alla rilevazione precedente`;
																} else {
																	return `📉 Peggioramento di ${Math.abs(trend).toFixed(1)} punti rispetto alla rilevazione precedente`;
																}
															})()}
														</div>
													</div>
												)}

												{/* Reference e Interpretazione */}
												<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
													<h3 className="font-bold text-blue-800 mb-3">📚 Interpretazione Clinica</h3>
													<div className="text-sm text-blue-700 space-y-2">
														<p><strong>AddiQoL normale:</strong> 85-120 punti (3.5-5.0/5)</p>
														<p><strong>Compromissione lieve:</strong> 65-84 punti (2.7-3.4/5)</p>
														<p><strong>Compromissione moderata:</strong> 45-64 punti (1.9-2.6/5)</p>
														<p><strong>Compromissione severa:</strong> &lt;45 punti (&lt;1.9/5)</p>
														<p className="mt-3 font-medium">
															💡 <strong>Evidenze 2025:</strong> Formulazioni ER-HC migliorano AddiQoL di +4 punti in media
														</p>
													</div>
												</div>
											</div>
										);
									})()}

									{records.length === 0 && (
										<div className="text-center py-8 text-gray-500">
											<div className="text-4xl mb-4">💭</div>
											<p>Nessun dato sulla qualità della vita disponibile.</p>
											<p className="text-sm mt-2">Compila almeno un record con i parametri QoL per visualizzare l'analisi.</p>
										</div>
									)}
								</CardContent>
							</Card>
						</motion.div>
					</TabsContent>

					<TabsContent value="terapia" className="mt-4">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between">
								<CardTitle className="text-lg font-semibold">Schema terapeutico attuale</CardTitle>
								<div className="flex gap-2">
									<Button onClick={autoCorrectToQuarters} variant="outline" size="sm" className="bg-blue-50 hover:bg-blue-100 border-blue-300">
										🔧 Auto-correzione quarti
									</Button>
									<div className="text-xs text-green-600 flex items-center gap-1">
										💾 Salvataggio automatico
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-6">
								{/* Farmaco utilizzato */}
								<div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
									<div className="flex items-center gap-2 mb-2">
										<span className="text-orange-600">💊</span>
										<span className="font-medium text-sm">Farmaco utilizzato</span>
									</div>
									<div className="text-blue-600 font-medium">
										CORTISONE ACETATO 25 mg compresse
									</div>
									<div className="text-sm text-gray-600 mt-1">
										Ogni compressa contiene 25 mg di principio attivo
									</div>
									<div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-3">
										<div className="text-xs text-yellow-800 font-medium flex items-center gap-1">
											⚠️ IMPORTANTE: Le compresse possono essere divise SOLO in quarti
										</div>
										<div className="text-xs text-yellow-700 mt-1">
											• 1/4 compressa = 6.25 mg • 1/2 compressa = 12.5 mg • 3/4 compressa = 18.75 mg • 1 compressa = 25 mg
										</div>
									</div>
								</div>

								{/* Dosaggi */}
								<div className="space-y-4">
									<div className="grid grid-cols-3 gap-4">
										<div className="text-center p-4 bg-blue-50 rounded-lg border">
											<div className="space-y-2">
												<Input
													type="number"
													step="0.25"
													min="0"
													max="50"
													value={currentTherapy.cortisoneAcetate.morning}
													onChange={(e) => updateCurrentTherapy('morning', parseFloat(e.target.value) || 0)}
													className="text-center text-lg font-bold text-blue-600 bg-white border-blue-300"
												/>
												<div className="text-xs text-gray-500">({(() => {
													const quarters = Math.round(currentTherapy.cortisoneAcetate.morning / 6.25);
													return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
														quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
															`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
												})()})</div>
											</div>
											<div className="text-sm font-medium text-gray-700">Mattina (mg)</div>
											<div className="text-xs text-gray-500">Ore 7:30 + 30 min</div>
										</div>
										<div className="text-center p-4 bg-blue-50 rounded-lg border">
											<div className="space-y-2">
												<Input
													type="number"
													step="0.25"
													min="0"
													max="50"
													value={currentTherapy.cortisoneAcetate.midday}
													onChange={(e) => updateCurrentTherapy('midday', parseFloat(e.target.value) || 0)}
													className="text-center text-lg font-bold text-blue-600 bg-white border-blue-300"
												/>
												<div className="text-xs text-gray-500">({(() => {
													const quarters = Math.round(currentTherapy.cortisoneAcetate.midday / 6.25);
													return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
														quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
															`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
												})()})</div>
											</div>
											<div className="text-sm font-medium text-gray-700">Mezzogiorno (mg)</div>
											<div className="text-xs text-gray-500">Ore 12:30 + 13 ore</div>
										</div>
										<div className="text-center p-4 bg-blue-50 rounded-lg border">
											<div className="space-y-2">
												<Input
													type="number"
													step="0.25"
													min="0"
													max="50"
													value={currentTherapy.cortisoneAcetate.evening}
													onChange={(e) => updateCurrentTherapy('evening', parseFloat(e.target.value) || 0)}
													className="text-center text-lg font-bold text-blue-600 bg-white border-blue-300"
												/>
												<div className="text-xs text-gray-500">({(() => {
													const quarters = Math.round(currentTherapy.cortisoneAcetate.evening / 6.25);
													return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
														quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
															`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
												})()})</div>
											</div>
											<div className="text-sm font-medium text-gray-700">Sera (mg)</div>
											<div className="text-xs text-gray-500">Ore 17:30 + 17 ore</div>
										</div>
									</div>

									{/* Totale giornaliero */}
									<div className="text-center p-3 bg-gray-100 rounded-lg border-2 border-gray-300">
										<div className="text-lg font-bold text-gray-800">
											Dose giornaliera totale: {(currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening).toFixed(2)} mg di cortisone acetato
										</div>
										<div className="text-sm text-gray-600 mt-1">
											Corrispondente a {((currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening) * 0.8).toFixed(1)} mg di idrocortisone
										</div>
										<div className="text-xs text-blue-600 mt-1">
											Totale: {(() => {
												const totalQuarters = Math.round((currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening) / 6.25);
												return `${Math.floor(totalQuarters / 4)} cp + ${totalQuarters % 4}/4`;
											})()} per die
										</div>
									</div>
								</div>

								{/* Errori di validazione */}
								{therapyErrors.length > 0 && (
									<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
										<h4 className="font-medium text-red-800 mb-2">⚠️ Avvisi di validazione</h4>
										<ul className="text-sm text-red-700 space-y-1">
											{therapyErrors.map((error, index) => (
												<li key={index}>• {error}</li>
											))}
										</ul>
										<p className="text-xs text-red-600 mt-2">
											I valori sono salvati automaticamente, ma si raccomanda di rivedere i dosaggi.
										</p>
									</div>
								)}

								{/* Note aggiuntive */}
								<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
									<h4 className="font-medium text-yellow-800 mb-2">📝 Linee guida dosaggio</h4>
									<div className="text-sm text-yellow-700 space-y-2">
										<div className="bg-blue-100 border border-blue-300 rounded p-2">
											<p className="font-medium text-blue-800">💡 Range terapeutici:</p>
											<ul className="mt-1 space-y-1 text-xs">
												<li>• <strong>Cortisone Acetato:</strong> Range 15-50 mg/die (linee guida AME)</li>
												<li>• <strong>Distribuzione:</strong> 60-70% mattina, 20-30% mezzogiorno, 10-20% sera</li>
												<li>• <strong>Florinef:</strong> Range 0.05-0.2 mg/die (50-200 μg/die)</li>
												<li>• <strong>Incrementi:</strong> Cortisone ±6.25mg, Florinef ±0.025mg</li>
											</ul>
										</div>
										<p>• Modificare i dosaggi con incrementi/decrementi di 0.25 mg (1/4 di compressa)</p>
										<p>• Rispettare il ritmo circadiano: dose maggiore al mattino</p>
										<p>• Assumere con il cibo. Se disturbi gastrici: rinforzare protezione gastrica</p>
										<p>• Non interrompere MAI bruscamente la terapia</p>
										<p>• Consultare sempre l'endocrinologo prima di modifiche significative</p>
									</div>
								</div>

								{/* Schema posologico e conversioni */}
								<div className="border rounded-lg">
									<div className="bg-gray-50 px-4 py-3 border-b">
										<h4 className="font-medium text-gray-800">📋 Principi del dosaggio giornaliero</h4>
									</div>
									<div className="p-4 space-y-3">
										<div className="text-sm space-y-2">
											<div className="font-medium">Somministrazioni al giorno:</div>
											<ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
												<li>Dose totale: {(currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening)} mg</li>
												<li>Maggiore concentrazione e attività fisiologica</li>
												<li>Minore incidenza di effetti collaterali</li>
												<li>Minor rischio di insufficienza surrenalica</li>
												<li>Esempio: 15 mg mattino - 5 mg mezzogiorno</li>
											</ul>
											<div className="mt-4 space-y-4">
												{/* Conversioni principali */}
												<div className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
													<div className="font-medium text-blue-800 mb-3">🔄 Conversioni terapeutiche equivalenti</div>
													<div className="grid grid-cols-2 gap-4 text-sm">
														<div className="space-y-2">
															<div className="font-medium text-blue-700">Glucocorticoidi standard</div>
															<div className="space-y-1 text-blue-700">
																<div><strong>Idrocortisone:</strong> {((currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening) * 0.8).toFixed(1)} mg</div>
																<div><strong>Prednisolone:</strong> {((currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening) * 0.2).toFixed(1)} mg</div>
																<div><strong>Metilprednisolone:</strong> {((currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening) * 0.16).toFixed(1)} mg</div>
																<div><strong>Desametasone:</strong> {((currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening) * 0.0375).toFixed(2)} mg</div>
															</div>
														</div>
														<div className="space-y-2">
															<div className="font-medium text-blue-700">Formulazioni specifiche</div>
															<div className="space-y-1 text-blue-700">
																<div><strong>Plenadren®:</strong> {((currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening) * 0.8).toFixed(1)} mg (monodose)</div>
																<div><strong>Idrocortisone cp:</strong> {((currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening) * 0.8 * 0.6).toFixed(1)} + {((currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening) * 0.8 * 0.4).toFixed(1)} mg</div>
															</div>
														</div>
													</div>
												</div>

												{/* Confronto formulazioni */}
												<div className="p-4 bg-green-50 rounded border border-green-200">
													<div className="font-medium text-green-800 mb-3">💊 Scelta della formulazione ottimale</div>
													<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
														{/* Cortisone Acetato */}
														<div className="bg-white p-3 rounded border">
															<div className="font-medium text-orange-600 mb-2">🔵 Cortisone Acetato</div>
															<div className="text-gray-700 space-y-1">
																<div className="text-xs font-medium text-green-600">✅ Indicato per:</div>
																<ul className="text-xs space-y-0.5 ml-2">
																	<li>• Terapia standard stabile</li>
																	<li>• Controllo ottimale</li>
																	<li>• Costo contenuto</li>
																	<li>• Lunga esperienza clinica</li>
																</ul>
																<div className="text-xs font-medium text-orange-600 mt-2">⚠️ Limitazioni:</div>
																<ul className="text-xs space-y-0.5 ml-2">
																	<li>• Necessita multiple dosi</li>
																	<li>• Profilo meno fisiologico</li>
																</ul>
															</div>
														</div>

														{/* Plenadren */}
														<div className="bg-white p-3 rounded border">
															<div className="font-medium text-purple-600 mb-2">🟣 Plenadren® (MR)</div>
															<div className="text-gray-700 space-y-1">
																<div className="text-xs font-medium text-green-600">✅ Indicato per:</div>
																<ul className="text-xs space-y-0.5 ml-2">
																	<li>• Profilo circadiano ottimale</li>
																	<li>• Monodose mattutina</li>
																	<li>• Migliore compliance</li>
																	<li>• QoL superiore</li>
																	<li>• Controllo metabolico</li>
																</ul>
																<div className="text-xs font-medium text-orange-600 mt-2">⚠️ Limitazioni:</div>
																<ul className="text-xs space-y-0.5 ml-2">
																	<li>• Costo elevato</li>
																	<li>• Non frazionabile</li>
																	<li>• Disponibilità limitata</li>
																</ul>
															</div>
														</div>

														{/* Idrocortisone */}
														<div className="bg-white p-3 rounded border">
															<div className="font-medium text-blue-600 mb-2">🔵 Idrocortisone</div>
															<div className="text-gray-700 space-y-1">
																<div className="text-xs font-medium text-green-600">✅ Indicato per:</div>
																<ul className="text-xs space-y-0.5 ml-2">
																	<li>• Molecola identica endogena</li>
																	<li>• Profilo più fisiologico</li>
																	<li>• Minori effetti collaterali</li>
																	<li>• Stress intercorrenti</li>
																</ul>
																<div className="text-xs font-medium text-orange-600 mt-2">⚠️ Limitazioni:</div>
																<ul className="text-xs space-y-0.5 ml-2">
																	<li>• Emivita breve</li>
																	<li>• 3-4 dosi/die</li>
																	<li>• Compliance ridotta</li>
																</ul>
															</div>
														</div>
													</div>

													{/* Raccomandazioni cliniche */}
													<div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
														<div className="font-medium text-yellow-800 mb-2">🎯 Raccomandazioni cliniche AME</div>
														<div className="text-sm text-yellow-700 space-y-1">
															<div><strong>Prima scelta:</strong> Plenadren® per nuove diagnosi (profilo circadiano ottimale)</div>
															<div><strong>Switch raccomandato:</strong> Da cortisone acetato a Plenadren® se controllo subottimale</div>
															<div><strong>Idrocortisone:</strong> Preferire in situazioni di stress, bambini, gravidanza</div>
															<div><strong>Mantenere cortisone:</strong> Se controllo ottimale e paziente soddisfatto</div>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>

								{/* Calcolatore Plenadren */}
								<div className="border rounded-lg">
									<div className="bg-purple-50 px-4 py-3 border-b">
										<h4 className="font-medium text-purple-800">🧮 Calcolatore dosaggio Plenadren®</h4>
									</div>
									<div className="p-4">
										<div className="space-y-4">
											{(() => {
												const equivalentHC = ((currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening) * 0.8);
												const availableDoses = [5, 10, 20];
												const recommendedDose = availableDoses.reduce((prev, curr) =>
													Math.abs(curr - equivalentHC) < Math.abs(prev - equivalentHC) ? curr : prev
												);

												return (
													<>
														<div className="grid grid-cols-3 gap-4 text-center">
															{availableDoses.map(dose => (
																<div key={dose} className={`p-3 rounded-lg border-2 ${dose === recommendedDose ? 'border-purple-400 bg-purple-100' : 'border-gray-200 bg-gray-50'}`}>
																	<div className={`text-lg font-bold ${dose === recommendedDose ? 'text-purple-600' : 'text-gray-600'}`}>
																		{dose} mg
																	</div>
																	<div className="text-sm text-gray-600">
																		{dose === recommendedDose ? '✅ Raccomandato' : `${dose < equivalentHC ? 'Sottodosaggio' : 'Sovradosaggio'}`}
																	</div>
																	<div className="text-xs text-gray-500 mt-1">
																		Δ: {(dose - equivalentHC).toFixed(1)} mg
																	</div>
																</div>
															))}
														</div>

														<div className="bg-purple-50 p-3 rounded border border-purple-200">
															<div className="text-sm space-y-2">
																<div><strong>Dose equivalente calcolata:</strong> {equivalentHC.toFixed(1)} mg di idrocortisone</div>
																<div><strong>Plenadren® suggerito:</strong> {recommendedDose} mg (monodose mattutina)</div>
																<div><strong>Orario ottimale:</strong> 6:00-7:00 (a digiuno, 1h prima colazione)</div>
																<div><strong>Differenza:</strong> {Math.abs(recommendedDose - equivalentHC).toFixed(1)} mg ({((recommendedDose - equivalentHC) / equivalentHC * 100).toFixed(1)}%)</div>
															</div>
														</div>

														<div className="bg-yellow-50 p-3 rounded border border-yellow-200">
															<div className="font-medium text-yellow-800 mb-2">⚠️ Note per il passaggio a Plenadren®</div>
															<ul className="text-sm text-yellow-700 space-y-1">
																<li>• <strong>Washout:</strong> Interrompere cortisone acetato la sera prima</li>
																<li>• <strong>Timing:</strong> Prima dose Plenadren® al mattino successivo</li>
																<li>• <strong>Monitoraggio:</strong> Controlli frequenti nelle prime 2-4 settimane</li>
																<li>• <strong>Aggiustamenti:</strong> Possibili dopo 2-3 settimane di osservazione</li>
																<li>• <strong>Stress:</strong> Mantenere protocollo emergenza con idrocortisone IV</li>
															</ul>
														</div>

														{recommendedDose !== equivalentHC && (
															<div className="bg-orange-50 p-3 rounded border border-orange-200">
																<div className="font-medium text-orange-800 mb-2">
																	{recommendedDose > equivalentHC ? '⬆️ Lieve sovradosaggio' : '⬇️ Lieve sottodosaggio'}
																</div>
																<div className="text-sm text-orange-700">
																	{recommendedDose > equivalentHC
																		? 'Il dosaggio Plenadren® è leggermente superiore. Monitorare segni di ipercortisolismo (pressione arteriosa, peso, glicemia).'
																		: 'Il dosaggio Plenadren® è leggermente inferiore. Monitorare segni di insufficienza (astenia, ipotensione, iponatremia).'
																	}
																</div>
															</div>
														)}
													</>
												);
											})()}
										</div>
									</div>
								</div>

								{/* Schema Idrocortisone */}
								<div className="border rounded-lg">
									<div className="bg-blue-50 px-4 py-3 border-b">
										<h4 className="font-medium text-blue-800">💊 Schema Idrocortisone standard</h4>
									</div>
									<div className="p-4">
										<div className="space-y-4">
											{(() => {
												const equivalentHC = ((currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening) * 0.8);
												const morningHC = Math.round(equivalentHC * 0.5 / 2.5) * 2.5; // Arrotonda a 2.5mg
												const middayHC = Math.round(equivalentHC * 0.3 / 2.5) * 2.5;
												const eveningHC = Math.round(equivalentHC * 0.2 / 2.5) * 2.5;
												const totalCalculated = morningHC + middayHC + eveningHC;

												return (
													<>
														<div className="grid grid-cols-3 gap-4 text-center">
															<div className="p-3 bg-blue-100 rounded-lg border">
																<div className="text-lg font-bold text-blue-600">{morningHC}</div>
																<div className="text-sm font-medium text-gray-700">Mattina (mg)</div>
																<div className="text-xs text-gray-500">Ore 6:30-7:30</div>
																<div className="text-xs text-blue-600">{(morningHC / 2.5).toFixed(1)} cp da 2.5mg</div>
															</div>
															<div className="p-3 bg-blue-100 rounded-lg border">
																<div className="text-lg font-bold text-blue-600">{middayHC}</div>
																<div className="text-sm font-medium text-gray-700">Mezzogiorno (mg)</div>
																<div className="text-xs text-gray-500">Ore 12:00-13:00</div>
																<div className="text-xs text-blue-600">{(middayHC / 2.5).toFixed(1)} cp da 2.5mg</div>
															</div>
															<div className="p-3 bg-blue-100 rounded-lg border">
																<div className="text-lg font-bold text-blue-600">{eveningHC}</div>
																<div className="text-sm font-medium text-gray-700">Sera (mg)</div>
																<div className="text-xs text-gray-500">Ore 17:00-18:00</div>
																<div className="text-xs text-blue-600">{(eveningHC / 2.5).toFixed(1)} cp da 2.5mg</div>
															</div>
														</div>

														<div className="text-center p-3 bg-gray-100 rounded-lg border-2 border-gray-300">
															<div className="text-lg font-bold text-gray-800">
																Dose totale: {totalCalculated} mg di idrocortisone
															</div>
															<div className="text-sm text-gray-600 mt-1">
																Equivalente a {(totalCalculated / 0.8).toFixed(1)} mg di cortisone acetato
															</div>
														</div>

														<div className="grid grid-cols-2 gap-4">
															<div className="bg-green-50 p-3 rounded border border-green-200">
																<div className="font-medium text-green-800 mb-2">✅ Vantaggi Idrocortisone</div>
																<ul className="text-sm text-green-700 space-y-1">
																	<li>• Molecola identica al cortisolo endogeno</li>
																	<li>• Profilo farmacocinetico più fisiologico</li>
																	<li>• Minore impatto metabolico</li>
																	<li>• Migliore controllo in situazioni di stress</li>
																	<li>• Meno effetti mineralcorticoidi</li>
																</ul>
															</div>
															<div className="bg-orange-50 p-3 rounded border border-orange-200">
																<div className="font-medium text-orange-800 mb-2">⚠️ Considerazioni</div>
																<ul className="text-sm text-orange-700 space-y-1">
																	<li>• Richiede 3-4 somministrazioni/die</li>
																	<li>• Emivita breve (8-12 ore)</li>
																	<li>• Compliance più difficile</li>
																	<li>• Maggior rischio di dimenticanze</li>
																	<li>• Costo superiore al cortisone acetato</li>
																</ul>
															</div>
														</div>

														<div className="bg-blue-50 p-3 rounded border border-blue-200">
															<div className="font-medium text-blue-800 mb-2">📋 Protocollo passaggio a idrocortisone</div>
															<div className="text-sm text-blue-700 space-y-1">
																<div><strong>1. Calcolo dose:</strong> Cortisone acetato × 0.8 = Idrocortisone equivalente</div>
																<div><strong>2. Distribuzione:</strong> 50% mattina, 30% mezzogiorno, 20% sera</div>
																<div><strong>3. Orari:</strong> Rispettare intervalli 5-6 ore tra le dosi</div>
																<div><strong>4. Aggiustamenti:</strong> Incrementi/decrementi di 2.5-5 mg</div>
																<div><strong>5. Monitoraggio:</strong> Controlli settimanali per 1 mese</div>
															</div>
														</div>
													</>
												);
											})()}
										</div>
									</div>
								</div>

								{/* Mineralcorticoidi */}
								<div className="border rounded-lg">
									<div className="bg-green-50 px-4 py-3 border-b">
										<h4 className="font-medium text-green-800">💊 Florinef (Fludrocortisone)</h4>
									</div>
									<div className="p-4">
										<div className="grid grid-cols-2 gap-4">
											<div>
												<div className="space-y-2">
													<Input
														type="number"
														step="0.025"
														min="0.025"
														max="0.3"
														value={currentTherapy.florinef}
														onChange={(e) => updateCurrentTherapy('florinef', parseFloat(e.target.value) || 0.1)}
														className="text-center text-lg font-bold text-green-600 bg-white border-green-300"
													/>
													<div className="text-xs text-gray-500">({(currentTherapy.florinef * 1000).toFixed(0)} μg)</div>
												</div>
												<div className="text-sm font-medium text-gray-700">mg al mattino</div>
												<div className="text-xs text-gray-500">Calcolata: {(currentTherapy.florinef * 1000).toFixed(0)} μg</div>
											</div>
											<div className="text-sm text-gray-700">
												<div className="font-medium mb-1">Dosaggio suggerito:</div>
												<div>• {(currentTherapy.florinef * 1000).toFixed(0)} μg/die</div>
												<div className="text-xs text-gray-500 mt-2">
													• Monitorizzazione e controllo mediante dosaggio
													• Controllo periodico di PAS e renina plasmatica
													• Seguire S.E: 5 mg mattino - 2.5 mg sera
												</div>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="piano" className="mt-4">
						<div className="space-y-6">
							{/* TERAPIA GLUCOCORTICOIDE */}
							<Card>
								<CardHeader className="bg-red-50 border-b">
									<CardTitle className="text-red-800">🔴 TERAPIA GLUCOCORTICOIDE</CardTitle>
									<div className="text-sm text-red-600">Farmaco: CORTISONE ACETATO 25 mg compresse</div>
								</CardHeader>
								<CardContent className="space-y-4 p-6">
									<div className="grid grid-cols-2 gap-6">
										{/* ATTUALE */}
										<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
											<h3 className="font-medium text-blue-800 mb-3">📋 ATTUALE:</h3>
											<div className="space-y-2 text-sm">
												<div>• Mattina (07:30): {currentTherapy.cortisoneAcetate.morning} mg ({(() => {
													const quarters = Math.round(currentTherapy.cortisoneAcetate.morning / 6.25);
													return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
														quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
															`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
												})()})</div>
												<div>• Mezzogiorno (12:30): {currentTherapy.cortisoneAcetate.midday} mg ({(() => {
													const quarters = Math.round(currentTherapy.cortisoneAcetate.midday / 6.25);
													return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
														quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
															`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
												})()})</div>
												<div>• Sera (17:30): {currentTherapy.cortisoneAcetate.evening} mg ({(() => {
													const quarters = Math.round(currentTherapy.cortisoneAcetate.evening / 6.25);
													return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
														quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
															`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
												})()})</div>
												<div className="font-medium pt-2 border-t">• TOTALE: {(currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening)} mg ({(() => {
													const totalQuarters = Math.round((currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening) / 6.25);
													return `${Math.floor(totalQuarters / 4)} cp + ${totalQuarters % 4}/4`;
												})()})</div>
											</div>
										</div>

										{/* PROPOSTA */}
										<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
											<h3 className="font-medium text-yellow-800 mb-3">⚠️ Terapia Proposta</h3>
											{proposedTherapy ? (
												<div className="space-y-2 text-sm">
													<div className="text-yellow-700">Motivazione: Ottimizzazione basata su algoritmo AddiDose++</div>
													<div>• Mattina (07:30): {proposedTherapy.cortisoneAcetate.morning} mg ({(() => {
														const quarters = Math.round(proposedTherapy.cortisoneAcetate.morning / 6.25);
														return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
															quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
																`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
													})()})</div>
													<div>• Mezzogiorno (12:30): {proposedTherapy.cortisoneAcetate.midday} mg ({(() => {
														const quarters = Math.round(proposedTherapy.cortisoneAcetate.midday / 6.25);
														return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
															quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
																`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
													})()})</div>
													{proposedTherapy.cortisoneAcetate.evening > 0 && <div>• Sera (17:30): {proposedTherapy.cortisoneAcetate.evening} mg ({(() => {
														const quarters = Math.round(proposedTherapy.cortisoneAcetate.evening / 6.25);
														return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
															quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
																`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
													})()})</div>}
													<div className="font-medium pt-2 border-t">• TOTALE: {(proposedTherapy.cortisoneAcetate.morning + proposedTherapy.cortisoneAcetate.midday + proposedTherapy.cortisoneAcetate.evening)} mg/die ({(() => {
														const totalQuarters = Math.round((proposedTherapy.cortisoneAcetate.morning + proposedTherapy.cortisoneAcetate.midday + proposedTherapy.cortisoneAcetate.evening) / 6.25);
														return `${Math.floor(totalQuarters / 4)} cp + ${totalQuarters % 4}/4`;
													})()})</div>
													<div className="text-xs text-yellow-600 mt-2">+ VARIAZIONE: {((proposedTherapy.cortisoneAcetate.morning + proposedTherapy.cortisoneAcetate.midday + proposedTherapy.cortisoneAcetate.evening) - (currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening)).toFixed(2)} mg</div>
												</div>
											) : (
												<div className="text-sm text-yellow-700">
													Eseguire l'algoritmo per ottenere raccomandazioni personalizzate
												</div>
											)}
										</div>
									</div>

									{/* Confronto Terapie */}
									<div className="bg-gray-50 border rounded-lg p-4">
										<h4 className="font-medium text-gray-800 mb-3">📊 Confronto Terapie</h4>
										<div className="grid grid-cols-2 gap-4">
											<div>
												<div className="text-sm font-medium text-blue-700 mb-2">🔵 Terapia Attuale (Cortisone Acetato 25mg)</div>
												<div className="space-y-1 text-xs text-gray-600">
													<div>Mattina (07:30): {currentTherapy.cortisoneAcetate.morning} mg ({(() => {
														const quarters = Math.round(currentTherapy.cortisoneAcetate.morning / 6.25);
														return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
															quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
																`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
													})()})</div>
													<div>Mezzogiorno (12:30): {currentTherapy.cortisoneAcetate.midday} mg ({(() => {
														const quarters = Math.round(currentTherapy.cortisoneAcetate.midday / 6.25);
														return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
															quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
																`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
													})()})</div>
													<div>Sera (17:30): {currentTherapy.cortisoneAcetate.evening} mg ({(() => {
														const quarters = Math.round(currentTherapy.cortisoneAcetate.evening / 6.25);
														return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
															quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
																`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
													})()})</div>
													<div className="font-medium">TOTALE: {(currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening)} mg/die ({(() => {
														const totalQuarters = Math.round((currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening) / 6.25);
														return `${Math.floor(totalQuarters / 4)} cp + ${totalQuarters % 4}/4`;
													})()})</div>
												</div>
											</div>
											<div>
												<div className="text-sm font-medium text-yellow-700 mb-2">⚠️ Terapia Proposta</div>
												{proposedTherapy ? (
													<div className="space-y-1 text-xs text-gray-600">
														<div>Mattina (07:30): {proposedTherapy.cortisoneAcetate.morning} mg ({(() => {
															const quarters = Math.round(proposedTherapy.cortisoneAcetate.morning / 6.25);
															return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
																quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
																	`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
														})()})</div>
														<div>Mezzogiorno (12:30): {proposedTherapy.cortisoneAcetate.midday} mg ({(() => {
															const quarters = Math.round(proposedTherapy.cortisoneAcetate.midday / 6.25);
															return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
																quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
																	`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
														})()})</div>
														{proposedTherapy.cortisoneAcetate.evening > 0 && <div>Sera (17:30): {proposedTherapy.cortisoneAcetate.evening} mg ({(() => {
															const quarters = Math.round(proposedTherapy.cortisoneAcetate.evening / 6.25);
															return quarters === 1 ? "1/4 cp" : quarters === 2 ? "1/2 cp" :
																quarters === 3 ? "3/4 cp" : quarters === 4 ? "1 cp" :
																	`${Math.floor(quarters / 4)} cp + ${quarters % 4}/4`;
														})()})</div>}
														<div className="font-medium">TOTALE: {(proposedTherapy.cortisoneAcetate.morning + proposedTherapy.cortisoneAcetate.midday + proposedTherapy.cortisoneAcetate.evening)} mg/die ({(() => {
															const totalQuarters = Math.round((proposedTherapy.cortisoneAcetate.morning + proposedTherapy.cortisoneAcetate.midday + proposedTherapy.cortisoneAcetate.evening) / 6.25);
															return `${Math.floor(totalQuarters / 4)} cp + ${totalQuarters % 4}/4`;
														})()})</div>
													</div>
												) : (
													<div className="text-xs text-gray-500">
														Eseguire algoritmo per raccomandazioni
													</div>
												)}
											</div>
										</div>
										<div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-800">
											⚠️ Valutazione specialistica endocrinologica consigliata prima di modificare la terapia
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Motivazione */}
							<Card>
								<CardHeader className="bg-blue-50 border-b">
									<CardTitle className="text-blue-800">📈 Motivazione, ACTH elevato</CardTitle>
								</CardHeader>
								<CardContent className="p-4">
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
										<h4 className="font-medium text-blue-800 mb-2">🔍 Validazione specialistica congiunta</h4>
										<div className="space-y-2 text-sm text-blue-700">
											<div>1. <strong>SCHEMA POSOLOGICO</strong> (3 somministrazioni):</div>
											<div className="ml-4 space-y-1">
												<div>• Dose elevata: &gt;30mg; necessarie 3 somministrazioni per:</div>
												<div>• Evitare due singole eccessive (&gt;15-20mg)</div>
												<div>• Mantenere livelli più stabili nelle 24h</div>
												<div>• Ridurre effetti collaterali da picchi eccessivi</div>
												<div>• Migliore controllo metabolico e pressorio</div>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* PROMEMORIA STRESS */}
							<Card>
								<CardHeader className="bg-orange-50 border-b">
									<CardTitle className="text-orange-800">⚠️ PROMEMORIA STRESS</CardTitle>
								</CardHeader>
								<CardContent className="p-4">
									<div className="space-y-3 text-sm">
										<div>• Febbre &gt;38°C: raddoppiare dose per 48-72h</div>
										<div>• Vomito/diarrea: Flebocortid 100mg IM urgente</div>
										<div>• Infezioni moderate: Flebocortid 50-100mg IM</div>
										<div>• Chirurgia minore: doppia dose 24h</div>
										<div>• Chirurgia maggiore: 100mg EV + 200mg/24h</div>
									</div>
								</CardContent>
							</Card>

							{/* TERAPIA MINERALCORTICOIDE */}
							<Card>
								<CardHeader className="bg-green-50 border-b">
									<CardTitle className="text-green-800">🔴 TERAPIA MINERALCORTICOIDE</CardTitle>
								</CardHeader>
								<CardContent className="p-4">
									<div className="space-y-4">
										<div className="bg-green-50 border border-green-200 rounded-lg p-4">
											<h4 className="font-medium text-green-800 mb-2">📋 ATTUALE: Florinef 0.1 mg al mattino</h4>
										</div>

										<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
											{proposedTherapy ? (
												<>
													<h4 className="font-medium text-blue-800 mb-2">💊 PROPOSTA: Florinef {proposedTherapy.florinef} mg</h4>
													<div className="space-y-2 text-sm text-blue-700">
														<div>📊 Motivazione: Ottimizzazione basata su parametri clinici</div>
														<div>🔄 Ricontrollo elettroliti e renina in 4-6 settimane</div>
														<div>📈 Variazione: {proposedTherapy.florinef > currentTherapy.florinef ? '↑' : proposedTherapy.florinef < currentTherapy.florinef ? '↓' : '='} {((proposedTherapy.florinef - currentTherapy.florinef) * 1000).toFixed(0)} μg</div>
													</div>
												</>
											) : (
												<>
													<h4 className="font-medium text-blue-800 mb-2">💊 PROPOSTA: Eseguire algoritmo</h4>
													<div className="space-y-2 text-sm text-blue-700">
														<div>📊 Premere "Esegui algoritmo" per raccomandazioni personalizzate</div>
													</div>
												</>
											)}
										</div>

										<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
											<h4 className="font-medium text-yellow-800 mb-2">📋 PROMEMORIA:</h4>
											<div className="space-y-1 text-sm text-yellow-700">
												<div>• Conservare Florinef in frigorifero (2-8°C)</div>
												<div>• Se sconto/ipertensione: ridurre dose</div>
												<div>• Target renina: 0.3-4 mU/L</div>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Original suggestion if needed */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center justify-between">
										<span>🤖 Raccomandazioni AddiDose++</span>
										{currentPatient && predictiveAnalysis && (
											<div className="flex items-center gap-2">
												<span className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded-full">
													AI Enhanced
												</span>
												<div className="flex items-center gap-1">
													<div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
													<div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
													<div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
												</div>
											</div>
										)}
									</CardTitle>
								</CardHeader>
								<CardContent className="p-4">
									{currentPatient && predictiveAnalysis && predictiveAnalysis.confidence > 60 && (
										<div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-lg mb-4">
											<div className="flex items-center gap-2 mb-2">
												<span className="font-medium">🧠 AI-Powered Recommendation</span>
												<span className="text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded">
													Confidence: {predictiveAnalysis.confidence}%
												</span>
											</div>
											<p className="text-sm">
												Basato su {currentPatient.therapyHistory.length} episodi terapeutici e pattern personalizzati di risposta
											</p>
										</div>
									)}
									<div className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">
										{suggestion}
									</div>
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					<TabsContent value="kit" className="mt-4">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Kit di Emergenza */}
							<Card className="h-fit">
								<CardHeader className="bg-red-50 border-b">
									<CardTitle className="text-red-800">🚨 Kit di Emergenza</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4 p-6">
									<div className="bg-red-100 border border-red-300 rounded-lg p-4">
										<h4 className="font-medium text-red-800 mb-3">Contenuto obbligatorio:</h4>
										<ul className="text-sm text-red-700 space-y-2">
											<li>• <strong>Flebocortid 100mg</strong> (cortisone iniettabile)</li>
											<li>• <strong>Siringhe</strong> sterili</li>
											<li>• <strong>Destrosio</strong> 10%</li>
											<li>• <strong>Certificato medico</strong></li>
											<li>• <strong>Scheda informativa</strong> per il pronto soccorso</li>
										</ul>
									</div>

									<div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
										<h4 className="font-medium text-yellow-800 mb-3">Quando usare il kit:</h4>
										<ul className="text-sm text-yellow-700 space-y-1">
											<li>• Vomito persistente (impossibile assumere terapia orale)</li>
											<li>• Diarrea severa con disidratazione</li>
											<li>• Febbre alta (&gt;38.5°C) con prostrazione</li>
											<li>• Trauma o shock</li>
											<li>• Perdita di coscienza</li>
											<li>• Mancanza di risposta al trattamento orale</li>
											<li>• Prima di interventi chirurgici in emergenza</li>
										</ul>
									</div>

									<div className="bg-green-50 border border-green-300 rounded-lg p-4">
										<h4 className="font-medium text-green-800 mb-3">Come fare l'iniezione:</h4>
										<ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
											<li>Pulire l'ampolla - Ricostruire con soluzione fisiologica</li>
											<li>Mescolare delicatamente</li>
											<li>Iniezione IM nel muscolo deltoide o gluteo</li>
											<li>Informare il 118 - Recarsi immediatamente al PS</li>
											<li>Informare gli operatori della tua condizione</li>
										</ol>
									</div>
								</CardContent>
							</Card>

							{/* Identificazione Medica */}
							<Card className="h-fit">
								<CardHeader className="bg-blue-50 border-b">
									<CardTitle className="text-blue-800">🆔 Identificazione Medica</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4 p-6">
									<div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
										<h4 className="font-medium text-blue-800 mb-3">Documenti essenziali:</h4>
										<ul className="text-sm text-blue-700 space-y-2">
											<li>• <strong>SOS Card</strong> (richiesta all'AiPAI)</li>
											<li>• <strong>Braccialetto/medaglietta</strong> di identificazione</li>
											<li>• <strong>Documento identità</strong></li>
											<li>• <strong>Tessera sanitaria</strong></li>
											<li>• <strong>Esenzione</strong> 036 (malattia rara)</li>
											<li>• <strong>Verbale invalidità</strong> se riconosciuta</li>
											<li>• <strong>Addison card</strong> per riconoscimento</li>
										</ul>
									</div>

									<div className="bg-purple-50 border border-purple-300 rounded-lg p-4">
										<h4 className="font-medium text-purple-800 mb-3">Informazioni da includere:</h4>
										<ul className="text-sm text-purple-700 space-y-1">
											<li>• <strong>Nome</strong> e cognome</li>
											<li>• <strong>Data di nascita</strong></li>
											<li>• <strong>Diagnosi</strong>: Morbo di Addison</li>
											<li>• <strong>Terapia attuale</strong> (dosaggi)</li>
											<li>• <strong>Contatti di emergenza</strong></li>
											<li>• <strong>Ospedale</strong> di riferimento per ricoveri</li>
											<li>• <strong>Nome endocrinologo</strong> di riferimento</li>
										</ul>
									</div>

									<div className="bg-orange-50 border border-orange-300 rounded-lg p-4">
										<h4 className="font-medium text-orange-800 mb-3">Contatti utili:</h4>
										<div className="text-sm text-orange-700 space-y-2">
											<div><strong>AiPAI:</strong> associazione@aipai.it</div>
											<div><strong>Emergenza:</strong> 118</div>
											<div><strong>Centro Antiveleni:</strong> 02-66101029</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* RICORDA SEMPRE */}
						<Card className="mt-6">
							<CardContent className="p-6">
								<div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
									<h3 className="font-bold text-yellow-800 mb-3">⚠️ RICORDA SEMPRE:</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-700">
										<ul className="space-y-1">
											<li>• <strong>La terapia è SALVAVITA:</strong> non sospenderla mai da solo!</li>
											<li>• <strong>In caso di dubbio</strong> sui sintomi/dosaggi: meglio aumentare la dose</li>
											<li>• <strong>Vomito/diarrea</strong> = emergenza medica (uso immediato del kit)</li>
											<li>• <strong>Portare sempre il kit</strong> di emergenza durante spostamenti</li>
										</ul>
										<ul className="space-y-1">
											<li>• <strong>Informare familiari</strong> e colleghi sulla tua condizione</li>
											<li>• <strong>Prima di interventi</strong> (anche dentista): informare e aumentare dose</li>
											<li>• <strong>Stress fisico/psichico:</strong> aumentare temporaneamente la dose</li>
											<li>• <strong>Conservare</strong> i farmaci in frigo a temperatura controllata</li>
										</ul>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="riferimenti" className="mt-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-lg font-semibold">Valori di riferimento per unità correnti</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								{/* Elettroliti */}
								<div>
									<h3 className="font-medium text-blue-800 mb-3 bg-blue-50 p-2 rounded">📊 Elettroliti</h3>
									<div className="grid grid-cols-2 gap-6">
										<div className="space-y-3">
											<div className="bg-gray-50 p-4 rounded-lg border">
												<div className="font-medium text-gray-800 mb-2">Sodio (mEq/L):</div>
												<div className="text-2xl font-bold text-blue-600">135-145</div>
												<div className="text-sm text-gray-600 mt-1">
													• Iponatremia: &lt;135 mEq/L<br />
													• Ipernatremia: &gt;145 mEq/L
												</div>
											</div>
											<div className="bg-gray-50 p-4 rounded-lg border">
												<div className="font-medium text-gray-800 mb-2">Potassio (mEq/L):</div>
												<div className="text-2xl font-bold text-blue-600">3.5-5.0</div>
												<div className="text-sm text-gray-600 mt-1">
													• Ipokaliemia: &lt;3.5 mEq/L<br />
													• Iperkaliemia: &gt;5.0 mEq/L
												</div>
											</div>
										</div>

										<div className="space-y-3">
											<div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
												<div className="font-medium text-yellow-800 mb-2">Ormoni</div>
												<div className="space-y-2 text-sm">
													<div>
														<span className="font-medium">ACTH (pg/mL):</span>
														<div className="text-lg font-bold text-orange-600">82-145</div>
													</div>
													<div>
														<span className="font-medium">Cortisolo (μg/dL):</span>
														<div className="text-lg font-bold text-orange-600">6-23</div>
													</div>
													<div>
														<span className="font-medium">Renina (mU/L):</span>
														<div className="text-lg font-bold text-orange-600">0.2-2.8</div>
														<div className="text-xs text-gray-600 mt-1">
															• Renina aumentata: &gt;2.8 mU/L<br />
															• Renina elevata: &gt;3.0 mU/L
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>

								{/* Fattori di conversione */}
								<div>
									<h3 className="font-medium text-green-800 mb-3 bg-green-50 p-2 rounded">🔄 Fattori di conversione</h3>
									<div className="bg-green-50 border border-green-200 rounded-lg p-4">
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
											<div>
												<div className="font-medium text-green-800 mb-2">Elettroliti (mEq/L ↔ mmol/L):</div>
												<ul className="space-y-1 text-green-700">
													<li>• Na+ (mEq/L) = 1 x mmol/L</li>
													<li>• K+ (mEq/L) = 1 x mmol/L</li>
												</ul>
											</div>
											<div>
												<div className="font-medium text-green-800 mb-2">ACTH (pg/mL ↔ pmol/L):</div>
												<ul className="space-y-1 text-green-700">
													<li>• pg/mL × 0.22 = pmol/L</li>
													<li>• pmol/L × 4.5 = pg/mL</li>
												</ul>
											</div>
											<div>
												<div className="font-medium text-green-800 mb-2">Cortisolo (μg/dL ↔ nmol/L):</div>
												<ul className="space-y-1 text-green-700">
													<li>• μg/dL × 27.59 = nmol/L</li>
													<li>• nmol/L × 0.036 = μg/dL</li>
												</ul>
											</div>
										</div>
									</div>
								</div>

								{/* Pressione arteriosa */}
								<div>
									<h3 className="font-medium text-red-800 mb-3 bg-red-50 p-2 rounded">🩺 Pressione arteriosa (mmHg)</h3>
									<div className="grid grid-cols-2 gap-4">
										<div className="bg-green-50 border border-green-200 rounded-lg p-4">
											<div className="font-medium text-green-800 mb-2">Normale: &lt;120/80</div>
											<div className="text-sm text-green-700">
												<div>Sistolica: &lt;120 mmHg</div>
												<div>Diastolica: &lt;80 mmHg</div>
											</div>
										</div>
										<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
											<div className="font-medium text-yellow-800 mb-2">Ipertensione: ≥140/90</div>
											<div className="text-sm text-yellow-700">
												<div>Sistolica: ≥140 mmHg</div>
												<div>Diastolica: ≥90 mmHg</div>
											</div>
										</div>
									</div>
									<div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
										<div className="font-medium text-blue-800 mb-2">🔍 Ipotensione ortostatica</div>
										<div className="text-sm text-blue-700 space-y-1">
											<div>Calo sistolica: ≥20 mmHg al passaggio clinostatico→ortostatico</div>
											<div>Calo diastolica: ≥10 mmHg al passaggio clinostatico→ortostatico</div>
										</div>
									</div>
								</div>

								{/* Additional Clinical References */}
								<div className="border-t pt-4">
									<h3 className="font-medium text-gray-800 mb-3">📋 Riferimenti Clinici Aggiuntivi</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="border rounded-lg p-4">
											<h4 className="font-medium mb-2 text-red-700">⚠️ Sintomi di Allerta</h4>
											<div className="text-sm space-y-1 text-gray-700">
												<p>• Nausea persistente</p>
												<p>• Vomito ripetuto</p>
												<p>• Debolezza estrema</p>
												<p>• Ipotensione severa (&lt;90/60)</p>
												<p>• Confusione mentale</p>
												<p>• Dolore addominale acuto</p>
												<p>• Desiderio compulsivo di sale</p>
											</div>
										</div>
										<div className="border rounded-lg p-4">
											<h4 className="font-medium mb-2 text-orange-700">📈 Aumento Dosaggio</h4>
											<div className="text-sm space-y-1 text-gray-700">
												<p>• Febbre &gt;38°C: raddoppiare dose</p>
												<p>• Interventi chirurgici: 100mg pre-op</p>
												<p>• Stress fisico/emotivo significativo</p>
												<p>• Gastroenteriti con vomito</p>
												<p>• Infezioni sistemiche</p>
												<p>• Traumi maggiori</p>
												<p>• Dentista/procedure invasive</p>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</main>

			{/* ===== PATIENT MANAGEMENT DIALOGS ===== */}
			{showPatientDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-semibold">
								{currentPatient ? "Modifica Paziente" : "Nuovo Paziente"}
							</h2>
							<button
								onClick={() => setShowPatientDialog(false)}
								className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
								title="Chiudi"
							>
								×
							</button>
						</div>
						<PatientForm
							patient={currentPatient}
							onSave={(patient) => {
								savePatientData(patient);
								setCurrentPatient(patient);
								setShowPatientDialog(false);
							}}
							onCancel={() => setShowPatientDialog(false)}
						/>
					</div>
				</div>
			)}

			{showTherapyHistory && currentPatient && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-semibold">Storia Terapeutica</h2>
							<Button
								variant="outline"
								onClick={() => setShowTherapyHistory(false)}
							>
								Chiudi
							</Button>
						</div>
						<TherapyHistory
							patient={currentPatient}
							onAddEntry={addTherapyEntry}
						/>
					</div>
				</div>
			)}

			{/* IMPORT DOCUMENTS DIALOG */}
			{showImportDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-xl font-semibold">📄 Importa Storia Clinica</h2>
							<Button
								variant="outline"
								onClick={() => setShowImportDialog(false)}
							>
								Chiudi
							</Button>
						</div>

						<DocumentImporter
							onFileUpload={handleFileUpload}
							uploadedDocuments={uploadedDocuments}
							isProcessing={isProcessingDoc}
							progress={importProgress}
						/>
					</div>
				</div>
			)}

			{/* NEW RECORD FORM DIALOG */}
			{showNewRecordForm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-xl font-semibold">➕ Nuovo Record</h2>
							<Button
								variant="outline"
								onClick={() => setShowNewRecordForm(false)}
							>
								Chiudi
							</Button>
						</div>

						<div className="space-y-4">
							{/* Caricamento File */}
							<div>
								<label className="block text-sm font-medium mb-2">📷 Carica immagine (OCR)</label>
								<Input type="file" accept="image/*" onChange={handleImageUpload} />
								{imgLoading && <p className="text-sm text-blue-600 mt-2">OCR {ocrProgress}%</p>}
								{extractedData && (
									<div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm mt-4">
										<div className="flex justify-between items-start">
											<div>
												<div className="font-medium text-blue-800">📷 Dati estratti dall'immagine</div>
												<div className="text-blue-600 text-xs mt-1">
													I campi sono stati precompilati. Verifica e modifica se necessario, poi clicca "Salva".
												</div>
												<div className="text-xs text-gray-600 mt-2">
													{extractedData.na && `Na: ${extractedData.na} • `}
													{extractedData.k && `K: ${extractedData.k} • `}
													{extractedData.acth && `ACTH: ${extractedData.acth} • `}
													{extractedData.cortisol && `Cortisolo: ${extractedData.cortisol}`}
												</div>
											</div>
											<button
												type="button"
												onClick={() => setExtractedData(null)}
												className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center text-lg font-semibold"
											>
												×
											</button>
										</div>
									</div>
								)}
							</div>

							<form onSubmit={(e) => { handleAddManual(e); setShowNewRecordForm(false); }} className="grid grid-cols-1 gap-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium mb-1">Data</label>
										<Input
											name="date"
											type="text"
											placeholder="gg/mm/aaaa"
											className="w-full"
											value={newRecordDate}
											onChange={(e) => {
												const formatted = formatDateInput(e.target.value);
												setNewRecordDate(formatted);
											}}
											maxLength={10}
											required
										/>
									</div>
								</div>

								{/* Laboratory Values */}
								<div className="border-t pt-4">
									<h3 className="font-medium mb-3">🧪 Valori di laboratorio</h3>
									<div className="grid grid-cols-2 gap-4">
										{/* Sodium */}
										<div>
											<label className="block text-sm font-medium mb-1">Sodio</label>
											<div className="flex gap-2">
												<Input
													name="na"
													placeholder="Na"
													step="any"
													className="flex-1"
													defaultValue={extractedData?.na || ""}
												/>
												<select
													className="border rounded px-2 py-1 text-xs"
													value={inputUnits.na}
													onChange={(e) => setInputUnits({ ...inputUnits, na: e.target.value as 'mEq/L' | 'mmol/L' })}
												>
													<option value="mEq/L">mEq/L</option>
													<option value="mmol/L">mmol/L</option>
												</select>
											</div>
										</div>

										{/* Potassium */}
										<div>
											<label className="block text-sm font-medium mb-1">Potassio</label>
											<div className="flex gap-2">
												<Input
													name="k"
													placeholder="K"
													step="any"
													className="flex-1"
													defaultValue={extractedData?.k || ""}
												/>
												<select
													className="border rounded px-2 py-1 text-xs"
													value={inputUnits.k}
													onChange={(e) => setInputUnits({ ...inputUnits, k: e.target.value as 'mEq/L' | 'mmol/L' })}
												>
													<option value="mEq/L">mEq/L</option>
													<option value="mmol/L">mmol/L</option>
												</select>
											</div>
										</div>

										{/* ACTH */}
										<div>
											<label className="block text-sm font-medium mb-1">ACTH</label>
											<div className="flex gap-2">
												<Input
													name="acth"
													placeholder="ACTH"
													className="flex-1"
													defaultValue={extractedData?.acth || ""}
												/>
												<select
													className="border rounded px-2 py-1 text-xs"
													value={inputUnits.acth}
													onChange={(e) => setInputUnits({ ...inputUnits, acth: e.target.value as 'pg/mL' | 'pmol/L' })}
												>
													<option value="pg/mL">pg/mL</option>
													<option value="pmol/L">pmol/L</option>
												</select>
											</div>
										</div>

										{/* Cortisol */}
										<div>
											<label className="block text-sm font-medium mb-1">Cortisolo</label>
											<div className="flex gap-2">
												<Input
													name="cort"
													placeholder="Cortisolo"
													className="flex-1"
													defaultValue={extractedData?.cortisol || ""}
												/>
												<select
													className="border rounded px-2 py-1 text-xs"
													value={inputUnits.cortisol}
													onChange={(e) => setInputUnits({ ...inputUnits, cortisol: e.target.value as 'μg/dL' | 'nmol/L' })}
												>
													<option value="μg/dL">μg/dL</option>
													<option value="nmol/L">nmol/L</option>
												</select>
											</div>
										</div>

										{/* Renin */}
										<div>
											<label className="block text-sm font-medium mb-1">Renina</label>
											<div className="flex gap-2">
												<Input
													name="renin"
													placeholder="Renina"
													className="flex-1"
													defaultValue={extractedData?.renin || ""}
												/>
												<select
													className="border rounded px-2 py-1 text-xs"
													value={inputUnits.renin}
													onChange={(e) => setInputUnits({ ...inputUnits, renin: e.target.value as 'ng/mL/h' | 'μg/L/h' | 'mUI/L' })}
												>
													<option value="ng/mL/h">ng/mL/h</option>
													<option value="μg/L/h">μg/L/h</option>
													<option value="mUI/L">mUI/L</option>
												</select>
											</div>
										</div>
									</div>
								</div>

								{/* Blood Pressure */}
								<div className="border-t pt-4">
									<h3 className="font-medium mb-3">🩺 Pressione arteriosa</h3>
									<div className="grid grid-cols-2 gap-4">
										{/* Blood Pressure Supine */}
										<div>
											<label className="block text-sm font-medium mb-1">PA Supina</label>
											<div className="flex gap-2">
												<Input name="bpSupSys" placeholder="Sistolica" className="flex-1" />
												<span className="self-end pb-2">/</span>
												<Input name="bpSupDia" placeholder="Diastolica" className="flex-1" />
												<select
													className="border rounded px-2 py-1 text-xs"
													value={inputUnits.bp}
													onChange={(e) => setInputUnits({ ...inputUnits, bp: e.target.value as 'mmHg' | 'kPa' })}
												>
													<option value="mmHg">mmHg</option>
													<option value="kPa">kPa</option>
												</select>
											</div>
										</div>

										{/* Blood Pressure Orthostatic */}
										<div>
											<label className="block text-sm font-medium mb-1">PA Ortostatica</label>
											<div className="flex gap-2">
												<Input name="bpOrthSys" placeholder="Sistolica" className="flex-1" />
												<span className="self-end pb-2">/</span>
												<Input name="bpOrthDia" placeholder="Diastolica" className="flex-1" />
												<select
													className="border rounded px-2 py-1 text-xs"
													value={inputUnits.bp}
													onChange={(e) => setInputUnits({ ...inputUnits, bp: e.target.value as 'mmHg' | 'kPa' })}
												>
													<option value="mmHg">mmHg</option>
													<option value="kPa">kPa</option>
												</select>
											</div>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4 mt-4">
										<label className="flex items-center">
											<input type="checkbox" name="crave" className="mr-2" />
											Craving sale
										</label>
										<label className="flex items-center">
											<input type="checkbox" name="vert" className="mr-2" />
											Vertigini
										</label>
									</div>
								</div>

								{/* Quality of Life Section */}
								<div className="border-t pt-4">
									<h3 className="font-medium text-blue-800 mb-3 bg-blue-50 p-2 rounded">
										💭 Valutazione Qualità della Vita (AddiQoL)
									</h3>
									<div className="text-xs text-gray-600 mb-3">
										Valuta ogni aspetto da 1 (molto scarso) a 5 (ottimo). Basato su evidenze JCEM 2025.
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium mb-1">
												😴 Livello di energia/affaticamento
											</label>
											<select name="fatigue" className="w-full border rounded px-2 py-1">
												<option value="">Non valutato</option>
												<option value="1">1 - Sempre esausto/a</option>
												<option value="2">2 - Spesso stanco/a</option>
												<option value="3">3 - Moderatamente energico/a</option>
												<option value="4">4 - Buona energia</option>
												<option value="5">5 - Piena energia</option>
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium mb-1">
												🧠 Umore e stato emotivo
											</label>
											<select name="moodChanges" className="w-full border rounded px-2 py-1">
												<option value="">Non valutato</option>
												<option value="1">1 - Molto depresso/ansioso</option>
												<option value="2">2 - Spesso giù di morale</option>
												<option value="3">3 - Umore variabile</option>
												<option value="4">4 - Generalmente positivo</option>
												<option value="5">5 - Ottimo umore</option>
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium mb-1">
												💼 Capacità lavorativa/studio
											</label>
											<select name="workCapacity" className="w-full border rounded px-2 py-1">
												<option value="">Non valutato</option>
												<option value="1">1 - Impossibile lavorare</option>
												<option value="2">2 - Molto limitato</option>
												<option value="3">3 - Moderatamente limitato</option>
												<option value="4">4 - Lieve limitazione</option>
												<option value="5">5 - Piena capacità</option>
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium mb-1">
												👥 Vita sociale e relazioni
											</label>
											<select name="socialLife" className="w-full border rounded px-2 py-1">
												<option value="">Non valutato</option>
												<option value="1">1 - Isolamento sociale</option>
												<option value="2">2 - Rapporti molto limitati</option>
												<option value="3">3 - Socialità ridotta</option>
												<option value="4">4 - Buoni rapporti sociali</option>
												<option value="5">5 - Vita sociale piena</option>
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium mb-1">
												🛌 Qualità del sonno
											</label>
											<select name="sleepQuality" className="w-full border rounded px-2 py-1">
												<option value="">Non valutato</option>
												<option value="1">1 - Insonnia grave</option>
												<option value="2">2 - Sonno molto disturbato</option>
												<option value="3">3 - Sonno irregolare</option>
												<option value="4">4 - Buon sonno</option>
												<option value="5">5 - Sonno ristoratore</option>
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium mb-1">
												🪞 Soddisfazione aspetto fisico
											</label>
											<select name="physicalAppearance" className="w-full border rounded px-2 py-1">
												<option value="">Non valutato</option>
												<option value="1">1 - Molto insoddisfatto/a</option>
												<option value="2">2 - Insoddisfatto/a</option>
												<option value="3">3 - Neutrale</option>
												<option value="4">4 - Soddisfatto/a</option>
												<option value="5">5 - Molto soddisfatto/a</option>
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium mb-1">
												🌟 Benessere generale
											</label>
											<select name="overallWellbeing" className="w-full border rounded px-2 py-1">
												<option value="">Non valutato</option>
												<option value="1">1 - Pessima qualità vita</option>
												<option value="2">2 - Scarsa qualità vita</option>
												<option value="3">3 - Qualità vita accettabile</option>
												<option value="4">4 - Buona qualità vita</option>
												<option value="5">5 - Ottima qualità vita</option>
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium mb-1">
												💊 Soddisfazione terapia attuale
											</label>
											<select name="treatmentSatisfaction" className="w-full border rounded px-2 py-1">
												<option value="">Non valutato</option>
												<option value="1">1 - Molto insoddisfatto/a</option>
												<option value="2">2 - Insoddisfatto/a</option>
												<option value="3">3 - Neutrale</option>
												<option value="4">4 - Soddisfatto/a</option>
												<option value="5">5 - Molto soddisfatto/a</option>
											</select>
										</div>
									</div>
								</div>

								<div className="flex gap-2 pt-4">
									<Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
										💾 Salva Record
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={() => setShowNewRecordForm(false)}
										className="flex-1"
									>
										Annulla
									</Button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// ===== PATIENT FORM COMPONENT ===== //
function PatientForm({
	patient,
	onSave,
	onCancel
}: {
	patient: PatientProfile | null;
	onSave: (patient: PatientProfile) => void;
	onCancel: () => void;
}) {
	// Function to convert dd/mm/yyyy to ISO date format
	const convertToISO = (dateString: string): string => {
		if (!dateString) return '';
		// If already in ISO format (yyyy-mm-dd), return as is
		if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
		// If in dd/mm/yyyy format, convert
		if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
			const [day, month, year] = dateString.split('/');
			return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
		}
		return '';
	};

	// Function to convert ISO date format to dd/mm/yyyy
	const convertToDisplayFormat = (dateString: string): string => {
		if (!dateString) return '';
		// If already in dd/mm/yyyy format, return as is
		if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateString;
		// If in ISO format (yyyy-mm-dd), convert
		if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
			const [year, month, day] = dateString.split('-');
			return `${day}/${month}/${year}`;
		}
		return dateString;
	};

	// Function to format date input as dd/mm/yyyy
	const formatDateInput = (value: string): string => {
		// Remove all non-numeric characters
		const numbers = value.replace(/\D/g, '');

		// Add slashes at appropriate positions
		if (numbers.length <= 2) {
			return numbers;
		} else if (numbers.length <= 4) {
			return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
		} else {
			return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
		}
	};

	const [formData, setFormData] = useState({
		firstName: patient?.firstName || '',
		lastName: patient?.lastName || '',
		dateOfBirth: convertToDisplayFormat(patient?.dateOfBirth || ''),
		weight: patient?.demographics.weight || 70,
		height: patient?.demographics.height || 170,
		sex: patient?.demographics.sex || 'M' as 'M' | 'F',
		diagnosis: patient?.demographics.diagnosis || 'Malattia di Addison',
		diagnosisDate: patient?.demographics.diagnosisDate || '',
		comorbidities: patient?.demographics.comorbidities.join(', ') || '',
		riskFactors: patient?.riskFactors.join(', ') || '',
		notes: patient?.notes.join('; ') || ''
	});

	// Function to calculate age from birth date
	const calculateAge = (birthDate: string): number => {
		if (!birthDate) return 0;
		const isoDate = convertToISO(birthDate);
		if (!isoDate) return 0;
		const today = new Date();
		const birth = new Date(isoDate);
		let age = today.getFullYear() - birth.getFullYear();
		const monthDiff = today.getMonth() - birth.getMonth();
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
			age--;
		}
		return age;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const calculatedAge = calculateAge(formData.dateOfBirth);

		const newPatient: PatientProfile = {
			id: patient?.id || Date.now().toString(),
			firstName: formData.firstName,
			lastName: formData.lastName,
			dateOfBirth: convertToISO(formData.dateOfBirth),
			demographics: {
				age: calculatedAge,
				weight: formData.weight,
				height: formData.height,
				sex: formData.sex,
				diagnosis: formData.diagnosis,
				diagnosisDate: formData.diagnosisDate,
				comorbidities: formData.comorbidities.split(',').map(s => s.trim()).filter(Boolean)
			},
			therapyHistory: patient?.therapyHistory || [],
			responsePatterns: patient?.responsePatterns || {
				cortisoneToACTH: 0,
				optimalDistribution: [40, 30, 30],
				stressResponse: 'normal',
				averageQoL: 50,
				stabilityScore: 50,
				doseResponseSlope: 0.5
			},
			notes: formData.notes.split(';').map(s => s.trim()).filter(Boolean),
			lastUpdated: new Date().toISOString(),
			riskFactors: formData.riskFactors.split(',').map(s => s.trim()).filter(Boolean)
		};

		onSave(newPatient);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium mb-1">Nome</label>
					<input
						type="text"
						value={formData.firstName}
						onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
						className="w-full border rounded px-3 py-2"
						required
					/>
				</div>
				<div>
					<label className="block text-sm font-medium mb-1">Cognome</label>
					<input
						type="text"
						value={formData.lastName}
						onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
						className="w-full border rounded px-3 py-2"
						required
					/>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-4">
				<div>
					<label className="block text-sm font-medium mb-1">Data di Nascita</label>
					<input
						type="text"
						placeholder="gg/mm/aaaa"
						value={formData.dateOfBirth}
						onChange={(e) => {
							const formatted = formatDateInput(e.target.value);
							setFormData({ ...formData, dateOfBirth: formatted });
						}}
						className="w-full border rounded px-3 py-2"
						maxLength={10}
						required
					/>
				</div>
				<div>
					<label className="block text-sm font-medium mb-1">Età</label>
					<div className="w-full border rounded px-3 py-2 bg-gray-100 flex items-center text-gray-700">
						{formData.dateOfBirth ? `${calculateAge(formData.dateOfBirth)} anni` : 'Inserisci data di nascita'}
					</div>
				</div>
				<div>
					<label className="block text-sm font-medium mb-1">Sesso</label>
					<select
						value={formData.sex}
						onChange={(e) => setFormData({ ...formData, sex: e.target.value as 'M' | 'F' })}
						className="w-full border rounded px-3 py-2"
					>
						<option value="M">Maschio</option>
						<option value="F">Femmina</option>
					</select>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium mb-1">Peso (kg)</label>
					<input
						type="number"
						value={formData.weight}
						onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
						className="w-full border rounded px-3 py-2"
						min="20"
						max="200"
						step="0.1"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium mb-1">Altezza (cm)</label>
					<input
						type="number"
						value={formData.height}
						onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) })}
						className="w-full border rounded px-3 py-2"
						min="100"
						max="250"
					/>
				</div>
			</div>

			<div>
				<label className="block text-sm font-medium mb-1">Diagnosi</label>
				<input
					type="text"
					value={formData.diagnosis}
					onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
					className="w-full border rounded px-3 py-2"
				/>
			</div>

			<div>
				<label className="block text-sm font-medium mb-1">Data Diagnosi</label>
				<input
					type="date"
					value={formData.diagnosisDate}
					onChange={(e) => setFormData({ ...formData, diagnosisDate: e.target.value })}
					className="w-full border rounded px-3 py-2"
				/>
			</div>

			<div>
				<label className="block text-sm font-medium mb-1">Comorbidità (separate da virgola)</label>
				<input
					type="text"
					value={formData.comorbidities}
					onChange={(e) => setFormData({ ...formData, comorbidities: e.target.value })}
					className="w-full border rounded px-3 py-2"
					placeholder="es. Diabete tipo 1, Tiroidite"
				/>
			</div>

			<div>
				<label className="block text-sm font-medium mb-1">Fattori di Rischio (separate da virgola)</label>
				<input
					type="text"
					value={formData.riskFactors}
					onChange={(e) => setFormData({ ...formData, riskFactors: e.target.value })}
					className="w-full border rounded px-3 py-2"
					placeholder="es. Gravidanza, Stress cronico"
				/>
			</div>

			<div>
				<label className="block text-sm font-medium mb-1">Note Cliniche</label>
				<textarea
					value={formData.notes}
					onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
					className="w-full border rounded px-3 py-2"
					rows={3}
					placeholder="Note aggiuntive separate da punto e virgola"
				/>
			</div>

			<div className="flex gap-2 pt-4">
				<Button type="submit" className="flex-1">
					{patient ? 'Aggiorna' : 'Crea'} Paziente
				</Button>
				<Button type="button" variant="outline" onClick={onCancel} className="flex-1">
					Annulla
				</Button>
			</div>
		</form>
	);
}

// ===== THERAPY HISTORY COMPONENT ===== //
function TherapyHistory({
	patient,
	onAddEntry
}: {
	patient: PatientProfile;
	onAddEntry: (effectiveness: 'excellent' | 'good' | 'fair' | 'poor', sideEffects?: string[]) => void;
}) {
	const [showAddEntry, setShowAddEntry] = useState(false);
	const [newEntry, setNewEntry] = useState({
		effectiveness: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
		sideEffects: ''
	});

	const handleAddEntry = () => {
		onAddEntry(
			newEntry.effectiveness,
			newEntry.sideEffects.split(',').map(s => s.trim()).filter(Boolean)
		);
		setShowAddEntry(false);
		setNewEntry({ effectiveness: 'good', sideEffects: '' });
	};

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="font-medium">Episodi Terapeutici ({patient.therapyHistory.length})</h3>
				<Button
					size="sm"
					onClick={() => setShowAddEntry(true)}
					className="bg-green-600 hover:bg-green-700"
				>
					+ Aggiungi Esito
				</Button>
			</div>

			{showAddEntry && (
				<div className="bg-gray-50 p-4 rounded-lg">
					<h4 className="font-medium mb-3">Nuovo Esito Terapeutico</h4>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium mb-1">Efficacia</label>
							<select
								value={newEntry.effectiveness}
								onChange={(e) => setNewEntry({ ...newEntry, effectiveness: e.target.value as any })}
								className="w-full border rounded px-3 py-2"
							>
								<option value="excellent">Eccellente</option>
								<option value="good">Buona</option>
								<option value="fair">Discreta</option>
								<option value="poor">Scarsa</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">Effetti Collaterali</label>
							<input
								type="text"
								value={newEntry.sideEffects}
								onChange={(e) => setNewEntry({ ...newEntry, sideEffects: e.target.value })}
								className="w-full border rounded px-3 py-2"
								placeholder="es. Nausea, Cefalea"
							/>
						</div>
					</div>
					<div className="flex gap-2 mt-3">
						<Button size="sm" onClick={handleAddEntry}>Salva</Button>
						<Button size="sm" variant="outline" onClick={() => setShowAddEntry(false)}>Annulla</Button>
					</div>
				</div>
			)}

			<div className="space-y-2 max-h-96 overflow-y-auto">
				{patient.therapyHistory.length === 0 ? (
					<p className="text-gray-500 text-center py-4">Nessun episodio registrato</p>
				) : (
					patient.therapyHistory.slice().reverse().map((entry, idx) => (
						<div key={idx} className="border rounded-lg p-3">
							<div className="flex justify-between items-start mb-2">
								<div>
									<span className="font-medium">{new Date(entry.date).toLocaleDateString()}</span>
									<span className={`ml-2 px-2 py-1 rounded text-xs ${entry.effectiveness === 'excellent' ? 'bg-green-100 text-green-800' :
										entry.effectiveness === 'good' ? 'bg-blue-100 text-blue-800' :
											entry.effectiveness === 'fair' ? 'bg-yellow-100 text-yellow-800' :
												'bg-red-100 text-red-800'
										}`}>
										{entry.effectiveness === 'excellent' ? 'Eccellente' :
											entry.effectiveness === 'good' ? 'Buona' :
												entry.effectiveness === 'fair' ? 'Discreta' : 'Scarsa'}
									</span>
								</div>
								<div className="text-sm text-gray-600">{entry.duration} giorni</div>
							</div>
							<div className="text-sm">
								<p><strong>Terapia:</strong> {entry.therapy.cortisoneAcetate.morning + entry.therapy.cortisoneAcetate.midday + entry.therapy.cortisoneAcetate.evening}mg + {entry.therapy.florinef}mg florinef</p>
								<p><strong>Motivo:</strong> {entry.reason}</p>
								{entry.sideEffects.length > 0 && (
									<p><strong>Effetti collaterali:</strong> {entry.sideEffects.join(', ')}</p>
								)}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}

// ===== DOCUMENT IMPORTER COMPONENT ===== //
function DocumentImporter({
	onFileUpload,
	uploadedDocuments,
	isProcessing,
	progress
}: {
	onFileUpload: (files: FileList) => void;
	uploadedDocuments: ClinicalDocument[];
	isProcessing: boolean;
	progress: number;
}) {
	const [dragActive, setDragActive] = useState(false);

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragActive(false);
		if (e.dataTransfer.files) {
			onFileUpload(e.dataTransfer.files);
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			onFileUpload(e.target.files);
		}
	};

	return (
		<div className="space-y-6">
			{/* Upload Area */}
			<div
				className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
					}`}
				onDrop={handleDrop}
				onDragOver={(e) => e.preventDefault()}
				onDragEnter={() => setDragActive(true)}
				onDragLeave={() => setDragActive(false)}
			>
				<div className="flex flex-col items-center gap-4">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
						<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
						</svg>
					</div>

					<div>
						<h3 className="text-lg font-medium mb-2">Carica Documenti Clinici</h3>
						<p className="text-sm text-gray-600 mb-4">
							Trascina i file qui o clicca per selezionare
						</p>

						<div className="grid grid-cols-2 gap-4 text-xs text-gray-500 mb-4">
							<div>
								<strong>Supportati:</strong>
								<ul className="mt-1">
									<li>• Referti PDF</li>
									<li>• File di testo (.txt)</li>
									<li>• Immagini (OCR)</li>
								</ul>
							</div>
							<div>
								<strong>Dati estratti:</strong>
								<ul className="mt-1">
									<li>• Dati demografici</li>
									<li>• Storia terapeutica</li>
									<li>• Risultati laboratorio</li>
									<li>• Comorbidità</li>
								</ul>
							</div>
						</div>

						<input
							type="file"
							multiple
							accept=".pdf,.txt,.json,.csv,.png,.jpg,.jpeg,.docx"
							onChange={handleFileSelect}
							className="hidden"
							id="file-upload"
						/>
						<label
							htmlFor="file-upload"
							className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
						>
							Seleziona File
						</label>
					</div>
				</div>
			</div>

			{/* Progress Bar */}
			{isProcessing && (
				<div className="bg-blue-50 p-4 rounded-lg">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium text-blue-800">Elaborazione in corso...</span>
						<span className="text-sm text-blue-600">{progress}%</span>
					</div>
					<div className="w-full bg-blue-200 rounded-full h-2">
						<div
							className="bg-blue-600 h-2 rounded-full transition-all duration-300"
							style={{ width: `${progress}%` }}
						></div>
					</div>
					<p className="text-xs text-blue-700 mt-2">
						Analisi intelligente del contenuto • Estrazione dati clinici • Validazione informazioni
					</p>
				</div>
			)}

			{/* Documenti già caricati */}
			{uploadedDocuments.length > 0 && (
				<div>
					<h4 className="font-medium mb-3">📚 Documenti Elaborati ({uploadedDocuments.length})</h4>
					<div className="space-y-3 max-h-64 overflow-y-auto">
						{uploadedDocuments.map((doc) => (
							<div key={doc.id} className="border rounded-lg p-4">
								<div className="flex items-start justify-between mb-2">
									<div className="flex items-center gap-3">
										<div className={`w-3 h-3 rounded-full ${doc.processingStatus === 'completed' ? 'bg-green-500' :
											doc.processingStatus === 'processing' ? 'bg-yellow-500 animate-pulse' :
												doc.processingStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
											}`}></div>
										<div>
											<p className="font-medium">{doc.fileName}</p>
											<p className="text-xs text-gray-500">
												{new Date(doc.uploadDate).toLocaleString()}
											</p>
										</div>
									</div>
									<div className="text-right">
										<div className={`text-xs px-2 py-1 rounded ${doc.confidence > 80 ? 'bg-green-100 text-green-800' :
											doc.confidence > 50 ? 'bg-yellow-100 text-yellow-800' :
												'bg-red-100 text-red-800'
											}`}>
											{doc.confidence}% confidence
										</div>
									</div>
								</div>

								{/* Dati estratti */}
								{Object.keys(doc.extractedData).length > 0 && (
									<div className="bg-gray-50 p-3 rounded mt-3">
										<p className="text-xs font-medium mb-2">Dati estratti:</p>
										<div className="text-xs space-y-1">
											{doc.extractedData.firstName && (
												<div>• Nome: {doc.extractedData.firstName} {doc.extractedData.lastName}</div>
											)}
											{doc.extractedData.demographics?.age && (
												<div>• Età: {doc.extractedData.demographics.age} anni</div>
											)}
											{doc.extractedData.demographics?.diagnosis && (
												<div>• Diagnosi: {doc.extractedData.demographics.diagnosis}</div>
											)}
											{doc.extractedData.therapyHistory && doc.extractedData.therapyHistory.length > 0 && (
												<div>• Terapie: {doc.extractedData.therapyHistory.length} episodi</div>
											)}
											{doc.extractedData.demographics?.comorbidities && doc.extractedData.demographics.comorbidities.length > 0 && (
												<div>• Comorbidità: {doc.extractedData.demographics.comorbidities.join(', ')}</div>
											)}
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* Istruzioni */}
			<div className="bg-gray-50 p-4 rounded-lg">
				<h4 className="font-medium mb-2">💡 Suggerimenti per il caricamento</h4>
				<ul className="text-sm text-gray-600 space-y-1">
					<li>• <strong>Referti medici:</strong> PDF o immagini saranno analizzati con OCR</li>
					<li>• <strong>File di testo:</strong> Struttura le informazioni chiaramente (es: "Nome: Mario Rossi, Età: 45")</li>
					<li>• <strong>Dati strutturati:</strong> JSON o CSV con campi standard</li>
					<li>• <strong>Qualità:</strong> Maggiore è la chiarezza del documento, migliore sarà l'estrazione</li>
					<li>• <strong>Privacy:</strong> I dati vengono processati localmente e non trasmessi</li>
				</ul>
			</div>
		</div>
	);
}