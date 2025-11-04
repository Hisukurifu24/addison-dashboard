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
	cortisolUrinary24h?: number | null;  // Cortisolo libero urinario 24h
	cortisolPost90min?: number | null;   // Cortisolo dosato 1.5h dopo assunzione farmaco
	renin?: number | null;
	bpSupSys?: number | null;  // PA supina sistolica
	bpSupDia?: number | null;  // PA supina diastolica
	bpOrthSys?: number | null; // PA ortostatica sistolica
	bpOrthDia?: number | null; // PA ortostatica diastolica
	glucose?: number | null;   // Glicemia (mg/dL)
	hypoglycemia?: boolean;    // Episodi ipoglicemici (<70 mg/dL o sintomatici)
	craveSalt?: boolean;
	vertigo?: boolean;
	// Terapia attuale al momento del record
	glucocorticoidDose?: string | null;  // Dosaggio glucocorticoide (es. "Cortisone Acetato 25mg")
	florinefDose?: string | null;        // Dosaggio Florinef (es. "0.1mg")
	otherMedications?: string | null;    // Altri farmaci assunti
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

// Drug interaction interfaces
interface DrugInteraction {
	drugName: string;
	detectedVariants: string[]; // varianti rilevate nel testo
	category: 'cyp3a4_inducer' | 'cyp3a4_inhibitor' | 'diuretic' | 'ace_inhibitor' | 'arb' |
	'anticoagulant' | 'nsaid' | 'estrogen' | 'thyroid' | 'antacid' | 'other';
	severity: 'critical' | 'major' | 'moderate' | 'minor';
	effect: 'increase_gc_need' | 'decrease_gc_need' | 'electrolyte_risk' | 'absorption_issue' | 'monitoring_needed';
	doseAdjustment: number; // % di modifica dose (es. 25 = +25%, -25 = -25%)
	recommendations: string[];
	monitoring: string[];
}

interface DrugAnalysisResult {
	detected: DrugInteraction[];
	totalDoseAdjustment: number; // % totale di aggiustamento
	alerts: string[];
	recommendations: string[];
	requiresMonitoring: string[];
}

// Formulazioni glucocorticoidi
interface GlucocorticoidFormulation {
	name: string;
	type: 'IR' | 'ER'; // Immediate Release / Extended Release
	administrations: number; // somministrazioni giornaliere
	bioavailability: number; // %
	potencyFactor: number; // fattore di conversione vs cortisone acetato
	description: string;
	benefits: string[];
	contraindications: string[];
	costCategory: 'low' | 'medium' | 'high';
}

// Score candidatura ER-HC
interface ERHCCandidacyScore {
	totalScore: number; // 0-100
	category: 'not_candidate' | 'possible' | 'good' | 'excellent';
	factors: {
		name: string;
		score: number;
		weight: number;
		reason: string;
	}[];
	recommendation: string;
	priority: 'low' | 'medium' | 'high' | 'urgent';
}

// Schema temporale dosaggio
interface DosingSchedule {
	schedule: 'two_dose' | 'three_dose' | 'er_once' | 'er_twice';
	timings: string[];
	doses: number[];
	rationale: string;
	optimizationFactors: string[];
}

// Protocollo switch formulazione
interface SwitchProtocol {
	fromFormulation: string;
	toFormulation: string;
	currentDose: number;
	targetDose: number;
	durationDays: number;
	steps: {
		day: number;
		oldFormulationDose: number;
		newFormulationDose: number;
		instructions: string;
	}[];
	monitoring: string[];
	warnings: string[];
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
	const [patients, setPatients] = useState<PatientProfile[]>([
		// Sample patients for testing
		{
			id: 'patient-001',
			firstName: 'Mario',
			lastName: 'Rossi',
			dateOfBirth: '15/05/1980',
			demographics: {
				age: 44,
				weight: 75,
				height: 175,
				sex: 'M',
				diagnosis: 'Morbo di Addison',
				diagnosisDate: '10/01/2020',
				comorbidities: ['Ipotiroidismo']
			},
			therapyHistory: [],
			responsePatterns: {
				cortisoneToACTH: 0.7,
				optimalDistribution: [60, 20, 20],
				stressResponse: 'normal',
				averageQoL: 3.5,
				stabilityScore: 75,
				doseResponseSlope: 0.8
			},
			notes: [],
			lastUpdated: new Date().toISOString(),
			riskFactors: []
		},
		{
			id: 'patient-002',
			firstName: 'Laura',
			lastName: 'Bianchi',
			dateOfBirth: '22/08/1992',
			demographics: {
				age: 32,
				weight: 62,
				height: 165,
				sex: 'F',
				diagnosis: 'Insufficienza surrenalica primaria',
				diagnosisDate: '15/06/2021',
				comorbidities: []
			},
			therapyHistory: [],
			responsePatterns: {
				cortisoneToACTH: 0.6,
				optimalDistribution: [50, 25, 25],
				stressResponse: 'normal',
				averageQoL: 4.0,
				stabilityScore: 80,
				doseResponseSlope: 0.9
			},
			notes: [],
			lastUpdated: new Date().toISOString(),
			riskFactors: []
		}
	]);
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

	// ===== DATABASE FARMACI E INTERFERENZE ===== //
	const DRUG_DATABASE: Record<string, Omit<DrugInteraction, 'detectedVariants'> & { variants: string[] }> = {
		// INDUTTORI CYP3A4 - Aumentano metabolismo GC
		rifampicina: {
			variants: ['rifampicina', 'rifampin', 'rifadin'],
			category: 'cyp3a4_inducer',
			severity: 'critical',
			effect: 'increase_gc_need',
			doseAdjustment: 50,
			recommendations: [
				'Aumentare dose glucocorticoide del 50-100%',
				'Monitorare ACTH e sintomi clinici strettamente',
				'Considerare formulazioni ER-HC per maggiore stabilità'
			],
			monitoring: ['ACTH ogni 2-3 settimane', 'Elettroliti settimanali', 'Pressione arteriosa']
		},
		fenitoina: {
			variants: ['fenitoina', 'phenytoin', 'dintoina', 'aurantin'],
			category: 'cyp3a4_inducer',
			severity: 'major',
			effect: 'increase_gc_need',
			doseAdjustment: 35,
			recommendations: [
				'Aumentare dose glucocorticoide del 25-50%',
				'Valutare switch ad antiepilettici non induttori se possibile'
			],
			monitoring: ['ACTH mensile', 'Sintomi ipocortisolismo']
		},
		carbamazepina: {
			variants: ['carbamazepina', 'carbamazepine', 'tegretol'],
			category: 'cyp3a4_inducer',
			severity: 'major',
			effect: 'increase_gc_need',
			doseAdjustment: 35,
			recommendations: [
				'Aumentare dose glucocorticoide del 25-50%',
				'Considerare alternative (lamotrigina, levetiracetam)'
			],
			monitoring: ['ACTH mensile', 'Funzionalità epatica']
		},
		fenobarbital: {
			variants: ['fenobarbital', 'phenobarbital', 'gardenal', 'luminal'],
			category: 'cyp3a4_inducer',
			severity: 'major',
			effect: 'increase_gc_need',
			doseAdjustment: 30,
			recommendations: [
				'Aumentare dose glucocorticoide del 30-40%',
				'Monitoraggio frequente nei primi 2 mesi'
			],
			monitoring: ['ACTH ogni 3-4 settimane']
		},

		// INIBITORI CYP3A4 - Riducono metabolismo GC
		ritonavir: {
			variants: ['ritonavir', 'norvir'],
			category: 'cyp3a4_inhibitor',
			severity: 'critical',
			effect: 'decrease_gc_need',
			doseAdjustment: -30,
			recommendations: [
				'Ridurre dose glucocorticoide del 25-35%',
				'Rischio significativo di Cushing iatrogeno',
				'Considerare monitoraggio cortisolo libero urinario'
			],
			monitoring: ['Cortisolo libero urinario 24h mensile', 'Peso corporeo', 'Glicemia', 'PA settimanale']
		},
		itraconazolo: {
			variants: ['itraconazolo', 'itraconazole', 'sporanox'],
			category: 'cyp3a4_inhibitor',
			severity: 'major',
			effect: 'decrease_gc_need',
			doseAdjustment: -25,
			recommendations: [
				'Ridurre dose glucocorticoide del 20-30%',
				'Monitorare segni di sovradosaggio'
			],
			monitoring: ['Peso', 'PA', 'Glicemia']
		},
		ketoconazolo: {
			variants: ['ketoconazolo', 'ketoconazole', 'nizoral'],
			category: 'cyp3a4_inhibitor',
			severity: 'major',
			effect: 'decrease_gc_need',
			doseAdjustment: -25,
			recommendations: [
				'Ridurre dose glucocorticoide del 20-30%',
				'⚠️ Ketoconazolo stesso inibisce sintesi steroidea'
			],
			monitoring: ['Funzione surrenalica', 'Elettroliti']
		},
		claritromicina: {
			variants: ['claritromicina', 'clarithromycin', 'klacid', 'macladin'],
			category: 'cyp3a4_inhibitor',
			severity: 'moderate',
			effect: 'decrease_gc_need',
			doseAdjustment: -20,
			recommendations: [
				'Ridurre dose glucocorticoide del 15-25% durante terapia',
				'Ritornare a dose normale dopo sospensione antibiotico'
			],
			monitoring: ['Sintomi Cushing durante terapia']
		},
		eritromicina: {
			variants: ['eritromicina', 'erythromycin', 'eritrocina'],
			category: 'cyp3a4_inhibitor',
			severity: 'moderate',
			effect: 'decrease_gc_need',
			doseAdjustment: -15,
			recommendations: [
				'Ridurre dose glucocorticoide del 10-20% durante terapia'
			],
			monitoring: ['PA', 'Sintomi']
		},

		// ESTROGENI - Aumentano CBG
		estradiolo: {
			variants: ['estradiolo', 'estradiol', 'progynova', 'climara'],
			category: 'estrogen',
			severity: 'major',
			effect: 'increase_gc_need',
			doseAdjustment: 30,
			recommendations: [
				'Aumentare dose glucocorticoide del 25-40%',
				'Gli estrogeni aumentano CBG → riduce cortisolo libero',
				'Considerare via transdermica per minore effetto'
			],
			monitoring: ['ACTH', 'Cortisolo libero', 'Sintomi ipocortisolismo']
		},
		etinilestradiolo: {
			variants: ['etinilestradiolo', 'ethinylestradiol', 'pillola', 'contraccettivo orale'],
			category: 'estrogen',
			severity: 'major',
			effect: 'increase_gc_need',
			doseAdjustment: 30,
			recommendations: [
				'Aumentare dose glucocorticoide del 25-40%',
				'Considerare contraccettivi progestinici puri'
			],
			monitoring: ['ACTH mensile primi 3 mesi']
		},

		// DIURETICI
		furosemide: {
			variants: ['furosemide', 'lasix'],
			category: 'diuretic',
			severity: 'moderate',
			effect: 'electrolyte_risk',
			doseAdjustment: 0,
			recommendations: [
				'Monitorare elettroliti frequentemente',
				'Rischio ipokaliemia aumentato',
				'Possibile necessità riduzione florinef'
			],
			monitoring: ['Na, K settimanali', 'Funzione renale']
		},
		idroclorotiazide: {
			variants: ['idroclorotiazide', 'hydrochlorothiazide', 'esidrex'],
			category: 'diuretic',
			severity: 'moderate',
			effect: 'electrolyte_risk',
			doseAdjustment: 0,
			recommendations: [
				'Monitorare ipokaliemia',
				'Può mascherare deficit mineralcorticoide'
			],
			monitoring: ['Elettroliti settimanali']
		},
		spironolattone: {
			variants: ['spironolattone', 'spironolactone', 'aldactone'],
			category: 'diuretic',
			severity: 'major',
			effect: 'electrolyte_risk',
			doseAdjustment: 0,
			recommendations: [
				'⚠️ ANTAGONISTA MINERALCORTICOIDE',
				'Può richiedere aumento significativo florinef',
				'Valutare alternative se possibile'
			],
			monitoring: ['Na, K ogni 3-5 giorni', 'Renina', 'PA']
		},

		// ACE-INIBITORI E SARTANI
		enalapril: {
			variants: ['enalapril', 'enapren'],
			category: 'ace_inhibitor',
			severity: 'moderate',
			effect: 'electrolyte_risk',
			doseAdjustment: 0,
			recommendations: [
				'Monitorare iperkaliemia',
				'Può ridurre aldosterone endogeno residuo'
			],
			monitoring: ['K, Na settimanali inizialmente']
		},
		ramipril: {
			variants: ['ramipril', 'triatec'],
			category: 'ace_inhibitor',
			severity: 'moderate',
			effect: 'electrolyte_risk',
			doseAdjustment: 0,
			recommendations: [
				'Attenzione a iperkaliemia',
				'Monitoraggio elettrolitico stretto'
			],
			monitoring: ['Elettroliti settimanali']
		},
		losartan: {
			variants: ['losartan', 'lortaan'],
			category: 'arb',
			severity: 'moderate',
			effect: 'electrolyte_risk',
			doseAdjustment: 0,
			recommendations: [
				'Monitorare iperkaliemia',
				'Effetti simili ad ACE-inibitori'
			],
			monitoring: ['K settimanale']
		},

		// ANTICOAGULANTI
		warfarin: {
			variants: ['warfarin', 'coumadin'],
			category: 'anticoagulant',
			severity: 'moderate',
			effect: 'monitoring_needed',
			doseAdjustment: 0,
			recommendations: [
				'Glucocorticoidi possono potenziare effetto anticoagulante',
				'INR più frequente dopo modifiche dose GC'
			],
			monitoring: ['INR settimanale dopo modifiche GC']
		},

		// FANS
		ibuprofene: {
			variants: ['ibuprofene', 'ibuprofen', 'brufen', 'moment'],
			category: 'nsaid',
			severity: 'moderate',
			effect: 'monitoring_needed',
			doseAdjustment: 0,
			recommendations: [
				'Rischio aumentato gastrite/ulcera se usato con GC',
				'Preferire paracetamolo quando possibile',
				'Considerare protezione gastrica'
			],
			monitoring: ['Sintomi gastrointestinali']
		},

		// ORMONI TIROIDEI
		levotiroxina: {
			variants: ['levotiroxina', 'levothyroxine', 'eutirox', 'tirosint'],
			category: 'thyroid',
			severity: 'moderate',
			effect: 'increase_gc_need',
			doseAdjustment: 10,
			recommendations: [
				'Ormoni tiroidei aumentano metabolismo cortisolo',
				'Aumenti levotiroxina possono slatentizzare insufficienza surrenalica',
				'Aggiustare GC PRIMA di ottimizzare terapia tiroidea'
			],
			monitoring: ['ACTH dopo modifiche levotiroxina', 'Sintomi clinici']
		},

		// ANTACIDI
		omeprazolo: {
			variants: ['omeprazolo', 'omeprazole', 'mopral', 'antra'],
			category: 'antacid',
			severity: 'minor',
			effect: 'absorption_issue',
			doseAdjustment: 0,
			recommendations: [
				'Può ridurre assorbimento HC se assunti insieme',
				'Distanziare assunzione di 2 ore'
			],
			monitoring: ['Efficacia terapia GC']
		},
		lansoprazolo: {
			variants: ['lansoprazolo', 'lansoprazole', 'limpidex'],
			category: 'antacid',
			severity: 'minor',
			effect: 'absorption_issue',
			doseAdjustment: 0,
			recommendations: [
				'Distanziare da assunzione GC di 2 ore'
			],
			monitoring: []
		}
	};

	// ===== FUNZIONE ANALISI INTERFERENZE FARMACOLOGICHE ===== //
	const analyzeDrugInteractions = (medicationsText: string | null): DrugAnalysisResult => {
		const result: DrugAnalysisResult = {
			detected: [],
			totalDoseAdjustment: 0,
			alerts: [],
			recommendations: [],
			requiresMonitoring: []
		};

		if (!medicationsText || medicationsText.trim() === '') {
			return result;
		}

		const textLower = medicationsText.toLowerCase();

		// Cerca ogni farmaco nel database
		Object.entries(DRUG_DATABASE).forEach(([drugKey, drugData]) => {
			const detectedVariants: string[] = [];

			// Controlla tutte le varianti del farmaco
			drugData.variants.forEach(variant => {
				if (textLower.includes(variant.toLowerCase())) {
					detectedVariants.push(variant);
				}
			});

			// Se trovato, aggiungi alle interazioni rilevate
			if (detectedVariants.length > 0) {
				const interaction: DrugInteraction = {
					drugName: drugKey.charAt(0).toUpperCase() + drugKey.slice(1),
					detectedVariants,
					category: drugData.category,
					severity: drugData.severity,
					effect: drugData.effect,
					doseAdjustment: drugData.doseAdjustment,
					recommendations: drugData.recommendations,
					monitoring: drugData.monitoring
				};

				result.detected.push(interaction);
			}
		});

		// Calcola aggiustamento totale dose
		const doseAdjustments = result.detected
			.filter(d => d.effect === 'increase_gc_need' || d.effect === 'decrease_gc_need')
			.map(d => d.doseAdjustment);

		if (doseAdjustments.length > 0) {
			// Calcola effetto cumulativo (non additivo ma moltiplicativo)
			result.totalDoseAdjustment = doseAdjustments.reduce((acc, curr) => {
				const factor = 1 + (curr / 100);
				return acc * factor;
			}, 1) - 1;
			result.totalDoseAdjustment = Math.round(result.totalDoseAdjustment * 100);
		}

		// Genera alerts per severità critica/major
		result.detected
			.filter(d => d.severity === 'critical' || d.severity === 'major')
			.forEach(d => {
				const severityIcon = d.severity === 'critical' ? '🚨' : '⚠️';
				result.alerts.push(
					`${severityIcon} ${d.drugName.toUpperCase()}: Interazione ${d.severity === 'critical' ? 'CRITICA' : 'IMPORTANTE'} - ` +
					`${d.effect === 'increase_gc_need' ? 'Richiede AUMENTO dose GC' :
						d.effect === 'decrease_gc_need' ? 'Richiede RIDUZIONE dose GC' :
							'Richiede monitoraggio'}`
				);
			});

		// Consolida raccomandazioni
		const uniqueRecs = new Set<string>();
		result.detected.forEach(d => {
			d.recommendations.forEach(rec => uniqueRecs.add(rec));
		});
		result.recommendations = Array.from(uniqueRecs);

		// Consolida monitoraggi
		const uniqueMon = new Set<string>();
		result.detected.forEach(d => {
			d.monitoring.forEach(mon => uniqueMon.add(mon));
		});
		result.requiresMonitoring = Array.from(uniqueMon);

		return result;
	};

	// ===== DATABASE FORMULAZIONI GLUCOCORTICOIDI ===== //
	const FORMULATIONS: Record<string, GlucocorticoidFormulation> = {
		cortisone_acetate: {
			name: 'Cortone Acetato',
			type: 'IR',
			administrations: 2,
			bioavailability: 80,
			potencyFactor: 1.0, // riferimento
			description: 'Formulazione standard a rilascio immediato',
			benefits: [
				'Costo contenuto',
				'Ampia esperienza clinica',
				'Facilmente frazionabile'
			],
			contraindications: [],
			costCategory: 'low'
		},
		hydrocortisone: {
			name: 'Idrocortisone',
			type: 'IR',
			administrations: 3,
			bioavailability: 90,
			potencyFactor: 0.8, // 25mg CA = 20mg HC
			description: 'Formulazione a rilascio immediato più potente',
			benefits: [
				'Maggiore potenza (emivita più breve)',
				'Migliore controllo con 3 dosi',
				'Opzione per via parenterale'
			],
			contraindications: [],
			costCategory: 'low'
		},
		plenadren: {
			name: 'Plenadren',
			type: 'ER',
			administrations: 1,
			bioavailability: 85,
			potencyFactor: 0.64, // 25mg CA = 16mg Plenadren (riduzione 20% per minore esposizione)
			description: 'Idrocortisone a rilascio modificato dual-release',
			benefits: [
				'Monosomministrazione mattutina (migliore aderenza)',
				'Riduzione peso corporeo (-1-2kg)',
				'Riduzione pressione arteriosa (-5mmHg sistolica)',
				'Miglioramento HbA1c (-0.3-0.6%)',
				'Miglioramento qualità vita (AddiQoL +4 punti)',
				'Esposizione cortisolo -20% vs IR'
			],
			contraindications: [
				'Malassorbimento intestinale',
				'Transito intestinale rapido',
				'Bypass gastrico',
				'Malattie infiammatorie croniche intestinali non controllate'
			],
			costCategory: 'high'
		},
		efmody: {
			name: 'Efmody',
			type: 'ER',
			administrations: 2,
			bioavailability: 88,
			potencyFactor: 0.72, // 25mg CA = 18mg Efmody
			description: 'Idrocortisone MR con rilascio circadiano',
			benefits: [
				'Ripristina ritmo circadiano fisiologico',
				'Dose serale (23:00) + dose mattutina (07:00)',
				'Ottimale per astenia mattutina',
				'Picco cortisolo al risveglio',
				'Miglioramento pattern sonno-veglia'
			],
			contraindications: [
				'Malassorbimento',
				'Transito rapido',
				'Difficoltà aderenza schema serale'
			],
			costCategory: 'high'
		}
	};

	// ===== CONVERSIONE TRA FORMULAZIONI ===== //
	const convertDoseBetweenFormulations = (
		dose: number,
		fromFormulation: keyof typeof FORMULATIONS,
		toFormulation: keyof typeof FORMULATIONS
	): number => {
		const from = FORMULATIONS[fromFormulation];
		const to = FORMULATIONS[toFormulation];

		// Converti prima a equivalente cortisone acetato, poi alla formulazione target
		const caEquivalent = dose / from.potencyFactor;
		const targetDose = caEquivalent * to.potencyFactor;

		// Arrotonda a 0.5mg per ER, a quarti per IR
		if (to.type === 'ER') {
			return Math.round(targetDose * 2) / 2;
		} else {
			return Math.round(targetDose * 4) / 4;
		}
	};

	// ===== ALGORITMO SELEZIONE SCHEMA TEMPORALE ===== //
	const selectOptimalDosingSchedule = (
		dose: number,
		symptoms: {
			morningFatigue?: boolean;
			afternoonFatigue?: boolean;
			eveningFatigue?: boolean;
			sleepDisturbance?: boolean;
			nightSymptoms?: boolean;
		},
		qolScore?: number
	): DosingSchedule => {
		const factors: string[] = [];

		// Valutazione schema basata su dose
		if (dose <= 25) {
			// Due dosi preferibile per dosi basse
			factors.push('Dose ≤25mg: schema a 2 somministrazioni riduce esposizione complessiva');

			if (symptoms.morningFatigue) {
				factors.push('Astenia mattutina: aumentare quota mattutina al 70%');
				return {
					schedule: 'two_dose',
					timings: ['07:30', '12:30'],
					doses: [Math.round(dose * 0.70 * 4) / 4, Math.round(dose * 0.30 * 4) / 4],
					rationale: 'Schema 70/30 per astenia mattutina',
					optimizationFactors: factors
				};
			}

			return {
				schedule: 'two_dose',
				timings: ['07:30', '12:30'],
				doses: [Math.round(dose * 0.67 * 4) / 4, Math.round(dose * 0.33 * 4) / 4],
				rationale: 'Schema standard 67/33 per dosi moderate',
				optimizationFactors: factors
			};
		} else {
			// Tre dosi necessarie per dosi elevate
			factors.push('Dose >25mg: tripla somministrazione per migliore copertura');

			if (symptoms.afternoonFatigue || symptoms.eveningFatigue) {
				factors.push('Astenia pomeridiana/serale: aumentare dosi pomeridiane');
				return {
					schedule: 'three_dose',
					timings: ['07:30', '12:30', '17:30'],
					doses: [
						Math.round(dose * 0.45 * 4) / 4,
						Math.round(dose * 0.35 * 4) / 4,
						Math.round(dose * 0.20 * 4) / 4
					],
					rationale: 'Schema 45/35/20 per supporto pomeridiano',
					optimizationFactors: factors
				};
			}

			return {
				schedule: 'three_dose',
				timings: ['07:30', '12:30', '17:30'],
				doses: [
					Math.round(dose * 0.50 * 4) / 4,
					Math.round(dose * 0.30 * 4) / 4,
					Math.round(dose * 0.20 * 4) / 4
				],
				rationale: 'Schema standard 50/30/20',
				optimizationFactors: factors
			};
		}
	};

	// ===== SCORE CANDIDATURA ER-HC ===== //
	const calculateERHCCandidacyScore = (params: {
		currentDose: number;
		hypertension: boolean;
		hypokaliemia: boolean;
		qolScore: number | null;
		adherenceIssues: boolean;
		morningFatigue: boolean;
		multipleAdministrations: number;
		age: number;
		bmi?: number;
		hba1c?: number;
	}): ERHCCandidacyScore => {
		const factors: ERHCCandidacyScore['factors'] = [];
		let totalScore = 0;

		// Fattore 1: Dose elevata (peso 15%)
		if (params.currentDose > 37.5) {
			const score = 15;
			factors.push({
				name: 'Dose molto elevata (>37.5mg)',
				score,
				weight: 15,
				reason: 'ER-HC riduce esposizione complessiva del 20%'
			});
			totalScore += score;
		} else if (params.currentDose > 25) {
			const score = 10;
			factors.push({
				name: 'Dose elevata (>25mg)',
				score,
				weight: 15,
				reason: 'Potenziale beneficio da riduzione esposizione'
			});
			totalScore += score;
		} else {
			factors.push({
				name: 'Dose standard (≤25mg)',
				score: 3,
				weight: 15,
				reason: 'Beneficio limitato ma possibile'
			});
			totalScore += 3;
		}

		// Fattore 2: Segni Cushingoidi (peso 20%)
		let cushingoidScore = 0;
		if (params.hypertension) cushingoidScore += 10;
		if (params.hypokaliemia) cushingoidScore += 10;
		if (params.bmi && params.bmi > 28) cushingoidScore += 5;
		if (params.hba1c && params.hba1c > 6.0) cushingoidScore += 5;

		const finalCushingScore = Math.min(20, cushingoidScore);
		if (finalCushingScore > 0) {
			factors.push({
				name: 'Segni Cushingoidi subclinici',
				score: finalCushingScore,
				weight: 20,
				reason: 'ER-HC riduce effetti metabolici avversi'
			});
			totalScore += finalCushingScore;
		}

		// Fattore 3: Qualità della Vita (peso 25%)
		if (params.qolScore !== null) {
			if (params.qolScore < 2.5) {
				factors.push({
					name: 'QoL critica (<2.5)',
					score: 25,
					weight: 25,
					reason: 'ER-HC migliora AddiQoL in media di +4 punti'
				});
				totalScore += 25;
			} else if (params.qolScore < 3.5) {
				factors.push({
					name: 'QoL subottimale (2.5-3.5)',
					score: 18,
					weight: 25,
					reason: 'Significativo margine di miglioramento'
				});
				totalScore += 18;
			} else {
				factors.push({
					name: 'QoL accettabile (≥3.5)',
					score: 8,
					weight: 25,
					reason: 'Miglioramento comunque possibile'
				});
				totalScore += 8;
			}
		}

		// Fattore 4: Aderenza terapeutica (peso 20%)
		if (params.adherenceIssues) {
			factors.push({
				name: 'Problemi di aderenza',
				score: 20,
				weight: 20,
				reason: 'Monosomministrazione Plenadren facilita aderenza'
			});
			totalScore += 20;
		} else if (params.multipleAdministrations >= 3) {
			factors.push({
				name: 'Schema complesso (≥3 somministrazioni)',
				score: 15,
				weight: 20,
				reason: 'Semplificazione schema migliora aderenza'
			});
			totalScore += 15;
		} else {
			factors.push({
				name: 'Aderenza buona',
				score: 5,
				weight: 20,
				reason: 'Beneficio da semplificazione comunque presente'
			});
			totalScore += 5;
		}

		// Fattore 5: Sintomi specifici (peso 20%)
		let symptomScore = 0;
		if (params.morningFatigue) {
			symptomScore += 15;
			factors.push({
				name: 'Astenia mattutina',
				score: 15,
				weight: 20,
				reason: 'Efmody ripristina picco mattutino fisiologico'
			});
		}

		if (symptomScore === 0) {
			factors.push({
				name: 'Sintomi aspecifici',
				score: 5,
				weight: 20,
				reason: 'Ritmo circadiano migliora benessere generale'
			});
			symptomScore = 5;
		}
		totalScore += symptomScore;

		// Determinazione categoria
		let category: ERHCCandidacyScore['category'];
		let priority: ERHCCandidacyScore['priority'];
		let recommendation: string;

		if (totalScore >= 75) {
			category = 'excellent';
			priority = 'urgent';
			recommendation = '🟢 CANDIDATO ECCELLENTE per ER-HC. Switch fortemente raccomandato. ' +
				'Benefici attesi significativi su QoL, parametri metabolici e aderenza.';
		} else if (totalScore >= 60) {
			category = 'good';
			priority = 'high';
			recommendation = '🟡 BUON CANDIDATO per ER-HC. Switch consigliato dopo discussione rischi-benefici e costi. ' +
				'Benefici attesi rilevanti.';
		} else if (totalScore >= 40) {
			category = 'possible';
			priority = 'medium';
			recommendation = '🟠 CANDIDATO POSSIBILE per ER-HC. Valutare caso per caso considerando preferenze paziente, ' +
				'costi e aspettative realistiche sui benefici.';
		} else {
			category = 'not_candidate';
			priority = 'low';
			recommendation = '⚪ Non candidato prioritario per ER-HC. Terapia convenzionale adeguata. ' +
				'Rivalutare in caso di peggioramento QoL o comparsa segni Cushingoidi.';
		}

		return {
			totalScore,
			category,
			factors,
			recommendation,
			priority
		};
	};

	// ===== PROTOCOLLO SWITCH FORMULAZIONE ===== //
	const generateSwitchProtocol = (
		fromFormulation: keyof typeof FORMULATIONS,
		toFormulation: keyof typeof FORMULATIONS,
		currentDose: number
	): SwitchProtocol => {
		const targetDose = convertDoseBetweenFormulations(currentDose, fromFormulation, toFormulation);
		const from = FORMULATIONS[fromFormulation];
		const to = FORMULATIONS[toFormulation];

		const protocol: SwitchProtocol = {
			fromFormulation: from.name,
			toFormulation: to.name,
			currentDose,
			targetDose,
			durationDays: 7,
			steps: [],
			monitoring: [],
			warnings: []
		};

		// Switch graduale in 7 giorni per ER-HC
		if (to.type === 'ER') {
			protocol.steps = [
				{
					day: 1,
					oldFormulationDose: currentDose,
					newFormulationDose: 0,
					instructions: `Ultimo giorno con ${from.name} ${currentDose}mg. ` +
						`Preparare ${to.name} per inizio domani mattina.`
				},
				{
					day: 2,
					oldFormulationDose: 0,
					newFormulationDose: targetDose,
					instructions: `INIZIO ${to.name} ${targetDose}mg al mattino (07:00-08:00). ` +
						`Sospendere completamente ${from.name}. Monitorare sintomi nelle prime 48h.`
				},
				{
					day: 3,
					oldFormulationDose: 0,
					newFormulationDose: targetDose,
					instructions: `Continuare ${to.name} ${targetDose}mg. Valutare tollerabilità e sintomi.`
				},
				{
					day: 7,
					oldFormulationDose: 0,
					newFormulationDose: targetDose,
					instructions: `Fine prima settimana. Valutazione clinica: sintomi, PA, peso, benessere generale.`
				}
			];

			protocol.monitoring = [
				'📅 Controllo sintomi giorni 2-3-7',
				'📅 Elettroliti e ACTH a 2 settimane',
				'📅 Valutazione QoL a 4 settimane',
				'📅 Follow-up completo a 8-12 settimane',
				'⚖️ Peso corporeo settimanale primi 2 mesi',
				'🩺 PA a domicilio giornaliera prima settimana, poi settimanale'
			];

			protocol.warnings = [
				'⚠️ NON dividere o frantumare compresse ER-HC',
				'⚠️ Assumere a stomaco vuoto o con pasto leggero',
				'⚠️ NON associare a inibitori pompa protonica nelle 2h precedenti',
				'⚠️ In caso di vomito <2h: dose extra IR-HC 10mg, NON ripetere ER-HC',
				'⚠️ Protocolli stress: usare sempre IR-HC, NON ER-HC',
				`⚠️ Tenere disponibile ${from.name} per emergenze primi 30 giorni`
			];

		} else {
			// Switch tra formulazioni IR
			protocol.steps = [
				{
					day: 1,
					oldFormulationDose: 0,
					newFormulationDose: targetDose,
					instructions: `Switch diretto a ${to.name} ${targetDose}mg. ` +
						`Distribuire secondo schema temporale ottimale.`
				}
			];

			protocol.monitoring = [
				'📅 Controllo sintomi a 3-5 giorni',
				'📅 Elettroliti a 2 settimane se dose modificata'
			];

			protocol.warnings = [
				'⚠️ Adeguare distribuzione oraria in base a emivita del nuovo farmaco'
			];
		}

		return protocol;
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
		cortisolUrinary24h: units.cortisol === 'μg/dL' ? '10-100 μg/24h' : '28-276 nmol/24h',
		cortisolPost90min: units.cortisol === 'μg/dL' ? '<20 (sovradosaggio se >25)' : '<552 (sovradosaggio se >690)',
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
			glucose: null,
			hypoglycemia: false,
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
		const cortUrinary24hValue = d.get("cortUrinary24h") as string;
		const cortPost90minValue = d.get("cortPost90min") as string;
		const reninValue = d.get("renin") as string;
		const bpSupSysValue = d.get("bpSupSys") as string;
		const bpSupDiaValue = d.get("bpSupDia") as string;
		const bpOrthSysValue = d.get("bpOrthSys") as string;
		const bpOrthDiaValue = d.get("bpOrthDia") as string;
		const glucoseValue = d.get("glucose") as string;

		// Terapia attuale
		const glucocorticoidDoseValue = d.get("glucocorticoidDose") as string;
		const florinefDoseValue = d.get("florinefDose") as string;
		const otherMedicationsValue = d.get("otherMedications") as string;

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
			cortisolUrinary24h: convertToStandard(cortUrinary24hValue, 'cortisol', inputUnits.cortisol),
			cortisolPost90min: convertToStandard(cortPost90minValue, 'cortisol', inputUnits.cortisol),
			renin: convertToStandard(reninValue, 'renin', inputUnits.renin),
			bpSupSys: convertToStandard(bpSupSysValue, 'bp', inputUnits.bp),
			bpSupDia: convertToStandard(bpSupDiaValue, 'bp', inputUnits.bp),
			bpOrthSys: convertToStandard(bpOrthSysValue, 'bp', inputUnits.bp),
			bpOrthDia: convertToStandard(bpOrthDiaValue, 'bp', inputUnits.bp),
			glucose: glucoseValue ? parseFloat(glucoseValue) : null,
			hypoglycemia: d.get("hypoglycemia") === 'on',
			craveSalt: d.get("crave") === 'on',
			vertigo: d.get("vert") === 'on',
			// Terapia attuale
			glucocorticoidDose: glucocorticoidDoseValue || null,
			florinefDose: florinefDoseValue || null,
			otherMedications: otherMedicationsValue || null,
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

		// ===== ANALISI INTERFERENZE FARMACOLOGICHE ===== //
		const drugAnalysis = analyzeDrugInteractions(r.otherMedications);

		// Aggiungi alerts da interferenze farmacologiche
		if (drugAnalysis.alerts.length > 0) {
			alerts.push(...drugAnalysis.alerts);
		}

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

		// ===== CALCOLO SCORE CANDIDATURA ER-HC ===== //
		const qolParamsForERHC = [r.fatigue, r.moodChanges, r.workCapacity, r.socialLife,
		r.sleepQuality, r.physicalAppearance, r.overallWellbeing, r.treatmentSatisfaction];
		const validQoLForERHC = qolParamsForERHC.filter(p => p !== null && p !== undefined);
		const avgQoLScoreForERHC = validQoLForERHC.length > 0 ? validQoLForERHC.reduce((a, b) => a + b, 0) / validQoLForERHC.length : null;

		const erHcScore = calculateERHCCandidacyScore({
			currentDose,
			hypertension,
			hypokaliemia,
			qolScore: avgQoLScoreForERHC,
			adherenceIssues: false, // Potrebbe essere un campo da aggiungere
			morningFatigue: r.fatigue !== null && r.fatigue >= 4,
			multipleAdministrations: currentTherapy.cortisoneAcetate.evening > 0 ? 3 : 2,
			age: currentPatient?.demographics.age || 50,
			bmi: undefined, // Potrebbe essere calcolato da peso/altezza se disponibili
			hba1c: undefined // Potrebbe essere aggiunto come parametro
		});

		// Genera raccomandazione ER-HC dettagliata
		if (erHcScore.totalScore >= 40) {
			const plenadrenDose = convertDoseBetweenFormulations(currentDose, 'cortisone_acetate', 'plenadren');
			const efmodyDose = convertDoseBetweenFormulations(currentDose, 'cortisone_acetate', 'efmody');

			erHcRecommendation = `
💊 VALUTAZIONE FORMULAZIONI A RILASCIO PROLUNGATO (ER-HC)

📊 SCORE CANDIDATURA: ${erHcScore.totalScore}/100 - ${erHcScore.category.toUpperCase()}
Priorità: ${erHcScore.priority.toUpperCase()}

${erHcScore.recommendation}

🔍 ANALISI FATTORI (dettaglio):`;

			erHcScore.factors.forEach(factor => {
				erHcRecommendation += `\n• ${factor.name}: ${factor.score}/${factor.weight} punti`;
				erHcRecommendation += `\n  Motivazione: ${factor.reason}`;
			});

			erHcRecommendation += `\n
📋 OPZIONI TERAPEUTICHE:

1️⃣ PLENADREN ${plenadrenDose}mg
   • Monosomministrazione mattutina (07:00-08:00)
   • Rilascio dual-phase (immediato + prolungato)
   • Benefici dimostrati:
     - Riduzione peso corporeo: -1-2kg
     - Riduzione PA sistolica: -5mmHg
     - Miglioramento HbA1c: -0.3-0.6%
     - Miglioramento AddiQoL: +4 punti
     - Esposizione cortisolo: -20% vs IR
   • Indicato per: scarsa aderenza, multi-somministrazioni, segni Cushingoidi

2️⃣ EFMODY ${efmodyDose}mg
   • Doppia somministrazione circadiana:
     - Sera (23:00): ${Math.round(efmodyDose * 0.67 * 2) / 2}mg
     - Mattina (07:00): ${Math.round(efmodyDose * 0.33 * 2) / 2}mg
   • Ripristina ritmo circadiano fisiologico
   • Particolarmente indicato per:
     - Astenia mattutina marcata
     - Disturbi del sonno
     - Desiderio picco cortisolo al risveglio

⚠️ CONTROINDICAZIONI ER-HC:
${FORMULATIONS.plenadren.contraindications.map(c => `   • ${c}`).join('\n')}

💰 CONSIDERAZIONI ECONOMICHE:
   • Costo: ER-HC >> IR (rapporto ~10:1)
   • Valutare copertura SSN/assicurativa
   • Considerare rapporto costo-beneficio individuale

⚕️ NECESSITÀ COMUNQUE IR-HC/CA:
   • Protocolli stress acuto
   • Situazioni emergenza
   • Backup per problemi gastrointestinali`;
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

		// Analisi necessità modifica dose (incrementi di 6.25mg = 1/4 + 1/4 di compressa)
		// LOGICA ACTH: nell'Addison è normale che sia elevato; se nei limiti normali → possibile sovradosaggio
		const normalACTH = r.acth !== null && r.acth !== undefined && r.acth >= 10 && r.acth <= 46;

		// Valutazione Qualità della Vita - Stanchezza eccessiva (fatigue score ≥4/5 indica necessità aumento)
		const excessiveFatigue = r.fatigue !== null && r.fatigue !== undefined && r.fatigue >= 4;

		// Ipoglicemia - può essere registrata come episodio o come valore glicemico basso
		const hypoglycemia = r.hypoglycemia || (r.glucose !== null && r.glucose !== undefined && r.glucose < 70);

		if (normalACTH) {
			// ACTH nella norma → possibile sovradosaggio di idrocortisone
			recommendedDose = Math.max(roundToQuarter(currentDose - 6.25), 15); // Min 15mg secondo linee guida
			dosageReason = "↘️ Riduzione dose: ACTH nei limiti normali suggerisce possibile sovradosaggio";
		} else if (hyponatremia || excessiveFatigue || hypoglycemia) {
			// Iponatremia, stanchezza eccessiva o ipoglicemia → sottodosaggio
			let reasons = [];
			if (hyponatremia) reasons.push("iponatremia");
			if (excessiveFatigue) reasons.push("stanchezza eccessiva (QoL)");
			if (hypoglycemia) reasons.push("ipoglicemia");

			recommendedDose = Math.min(roundToQuarter(currentDose + 6.25), 50); // Max 50mg secondo linee guida
			dosageReason = "↗️ Aumento dose per: " + reasons.join(", ");
		} else if (hypertension && !hypokaliemia) {
			recommendedDose = Math.max(roundToQuarter(currentDose - 6.25), 15); // Min 15mg secondo linee guida
			dosageReason = "↘️ Riduzione dose per ipertensione ben controllata";
		} else {
			// Se nessuna modifica necessaria, assicuriamoci che la dose attuale sia comunque arrotondata
			recommendedDose = roundToQuarter(currentDose);
		}

		// ===== AGGIUSTAMENTO PER INTERFERENZE FARMACOLOGICHE ===== //
		let drugAdjustedDose = recommendedDose;
		let drugAdjustmentNote = "";

		if (drugAnalysis.detected.length > 0 && drugAnalysis.totalDoseAdjustment !== 0) {
			const adjustmentFactor = 1 + (drugAnalysis.totalDoseAdjustment / 100);
			drugAdjustedDose = roundToQuarter(recommendedDose * adjustmentFactor);

			// Assicuriamoci di rispettare i limiti
			drugAdjustedDose = Math.max(15, Math.min(50, drugAdjustedDose));

			const adjustmentPercent = Math.abs(drugAnalysis.totalDoseAdjustment);
			const direction = drugAnalysis.totalDoseAdjustment > 0 ? 'AUMENTO' : 'RIDUZIONE';

			drugAdjustmentNote = `\n\n💊 AGGIUSTAMENTO PER INTERFERENZE FARMACOLOGICHE:\n` +
				`• ${direction} dose del ${adjustmentPercent}% per interazioni farmacologiche\n` +
				`• Dose base clinica: ${recommendedDose}mg → Dose aggiustata: ${drugAdjustedDose}mg\n` +
				`• Farmaci rilevati: ${drugAnalysis.detected.map(d => d.drugName).join(', ')}`;

			// Aggiorna la dose raccomandata
			recommendedDose = drugAdjustedDose;

			// Aggiorna il motivo del dosaggio
			if (dosageReason) {
				dosageReason += drugAdjustmentNote;
			} else {
				dosageReason = "💊 Aggiustamento per interferenze farmacologiche" + drugAdjustmentNote;
			}
		}

		// ===== SCHEMA POSOLOGICO OTTIMIZZATO ===== //
		const optimalSchedule = selectOptimalDosingSchedule(
			recommendedDose,
			{
				morningFatigue: r.fatigue !== null && r.fatigue >= 4,
				afternoonFatigue: r.workCapacity !== null && r.workCapacity <= 2,
				eveningFatigue: r.socialLife !== null && r.socialLife <= 2,
				sleepDisturbance: r.sleepQuality !== null && r.sleepQuality <= 2,
				nightSymptoms: false
			},
			avgQoLScoreForERHC
		);

		// Usa lo schema ottimizzato
		let morningDose = optimalSchedule.doses[0];
		let middayDose = optimalSchedule.doses[1];
		let eveningDose = optimalSchedule.doses[2] || 0;
		let scheduleRationale = optimalSchedule.rationale;
		let scheduleOptimizations = optimalSchedule.optimizationFactors;

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

		// Aggiungi monitoraggi specifici per interferenze farmacologiche
		if (drugAnalysis.requiresMonitoring.length > 0) {
			monitoring.push(""); // Spazio
			monitoring.push("💊 MONITORAGGI PER INTERAZIONI FARMACOLOGICHE:");
			drugAnalysis.requiresMonitoring.forEach(mon => {
				monitoring.push(`  • ${mon}`);
			});
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

		// ===== SEZIONE INTERFERENZE FARMACOLOGICHE ===== //
		if (drugAnalysis.detected.length > 0) {
			finalRecommendation.push("");
			finalRecommendation.push("💊 INTERFERENZE FARMACOLOGICHE RILEVATE");
			finalRecommendation.push("=".repeat(45));

			// Riepilogo interazioni
			finalRecommendation.push("");
			finalRecommendation.push(`📋 FARMACI RILEVATI: ${drugAnalysis.detected.length}`);

			// Dettagli per ogni farmaco
			drugAnalysis.detected.forEach(drug => {
				const severityEmoji = drug.severity === 'critical' ? '🚨' :
					drug.severity === 'major' ? '⚠️' :
						drug.severity === 'moderate' ? '⚡' : 'ℹ️';

				finalRecommendation.push("");
				finalRecommendation.push(`${severityEmoji} ${drug.drugName.toUpperCase()} (${drug.severity.toUpperCase()})`);
				finalRecommendation.push(`   Varianti rilevate: ${drug.detectedVariants.join(', ')}`);

				if (drug.doseAdjustment !== 0) {
					const sign = drug.doseAdjustment > 0 ? '+' : '';
					finalRecommendation.push(`   Aggiustamento dose: ${sign}${drug.doseAdjustment}%`);
				}

				if (drug.recommendations.length > 0) {
					finalRecommendation.push(`   Raccomandazioni:`);
					drug.recommendations.forEach(rec => {
						finalRecommendation.push(`     • ${rec}`);
					});
				}
			});

			// Effetto totale
			if (drugAnalysis.totalDoseAdjustment !== 0) {
				finalRecommendation.push("");
				finalRecommendation.push("📊 EFFETTO CUMULATIVO:");
				const sign = drugAnalysis.totalDoseAdjustment > 0 ? '+' : '';
				finalRecommendation.push(`   Aggiustamento totale dose: ${sign}${drugAnalysis.totalDoseAdjustment}%`);
				finalRecommendation.push(`   Dose base clinica: ${drugAdjustedDose / (1 + drugAnalysis.totalDoseAdjustment / 100)} mg`);
				finalRecommendation.push(`   Dose aggiustata finale: ${drugAdjustedDose} mg`);
			}

			// Raccomandazioni generali
			if (drugAnalysis.recommendations.length > 0) {
				finalRecommendation.push("");
				finalRecommendation.push("📌 RACCOMANDAZIONI GENERALI:");
				drugAnalysis.recommendations.forEach(rec => {
					finalRecommendation.push(`   • ${rec}`);
				});
			}
		}

		if (erHcRecommendation) {
			finalRecommendation.push("");
			finalRecommendation.push("🔬 FORMULAZIONI AVANZATE (ER-HC)");
			finalRecommendation.push("-".repeat(35));
			finalRecommendation.push(erHcRecommendation);

			// Aggiungi protocollo di switch se candidato buono/eccellente
			if (erHcScore.totalScore >= 60) {
				const switchToPlenadren = generateSwitchProtocol('cortisone_acetate', 'plenadren', currentDose);
				const switchToEfmody = generateSwitchProtocol('cortisone_acetate', 'efmody', currentDose);

				finalRecommendation.push("");
				finalRecommendation.push("🔄 PROTOCOLLI DI SWITCH (se approvato)");
				finalRecommendation.push("=".repeat(40));

				// Protocollo Plenadren
				finalRecommendation.push("");
				finalRecommendation.push(`📋 OPZIONE A: SWITCH A PLENADREN`);
				finalRecommendation.push(`Dose attuale CA: ${switchToPlenadren.currentDose}mg → Dose target Plenadren: ${switchToPlenadren.targetDose}mg`);
				finalRecommendation.push(`Durata switch: ${switchToPlenadren.durationDays} giorni`);
				finalRecommendation.push("");
				finalRecommendation.push("📅 PIANO DETTAGLIATO:");
				switchToPlenadren.steps.forEach(step => {
					finalRecommendation.push(`Giorno ${step.day}:`);
					if (step.oldFormulationDose > 0) {
						finalRecommendation.push(`  • ${switchToPlenadren.fromFormulation}: ${step.oldFormulationDose}mg`);
					}
					if (step.newFormulationDose > 0) {
						finalRecommendation.push(`  • ${switchToPlenadren.toFormulation}: ${step.newFormulationDose}mg`);
					}
					finalRecommendation.push(`  ℹ️  ${step.instructions}`);
					finalRecommendation.push("");
				});

				finalRecommendation.push("⚠️ AVVERTENZE IMPORTANTI:");
				switchToPlenadren.warnings.forEach(w => finalRecommendation.push(w));

				finalRecommendation.push("");
				finalRecommendation.push("📊 MONITORAGGIO POST-SWITCH:");
				switchToPlenadren.monitoring.forEach(m => finalRecommendation.push(m));

				// Protocollo Efmody
				if (r.fatigue && r.fatigue >= 4) {
					finalRecommendation.push("");
					finalRecommendation.push("─".repeat(40));
					finalRecommendation.push("");
					finalRecommendation.push(`📋 OPZIONE B: SWITCH A EFMODY (per astenia mattutina)`);
					finalRecommendation.push(`Dose attuale CA: ${switchToEfmody.currentDose}mg → Dose target Efmody: ${switchToEfmody.targetDose}mg`);
					finalRecommendation.push("");
					finalRecommendation.push("📅 SCHEMA CIRCADIANO:");
					finalRecommendation.push(`  • Sera (23:00): ${Math.round(switchToEfmody.targetDose * 0.67 * 2) / 2}mg`);
					finalRecommendation.push(`  • Mattina (07:00): ${Math.round(switchToEfmody.targetDose * 0.33 * 2) / 2}mg`);
					finalRecommendation.push("");
					finalRecommendation.push("💡 VANTAGGI SPECIFICI:");
					finalRecommendation.push("  • Picco cortisolo fisiologico al risveglio");
					finalRecommendation.push("  • Migliore energia mattutina");
					finalRecommendation.push("  • Qualità del sonno ottimizzata");
				}

				finalRecommendation.push("");
				finalRecommendation.push("🏥 REQUISITI PRE-SWITCH:");
				finalRecommendation.push("  • Approvazione specialista endocrinologo");
				finalRecommendation.push("  • Valutazione funzionalità gastrointestinale");
				finalRecommendation.push("  • Counseling su costi e aspettative");
				finalRecommendation.push("  • Educazione protocolli stress con ER-HC");
				finalRecommendation.push("  • Disponibilità backup IR-HC per emergenze");
			}
		}

		// Aggiungi razionale schema temporale
		if (scheduleOptimizations.length > 0) {
			finalRecommendation.push("");
			finalRecommendation.push("⏰ RAZIONALE SCHEMA TEMPORALE");
			finalRecommendation.push("-".repeat(35));
			finalRecommendation.push(`Schema selezionato: ${scheduleRationale}`);
			finalRecommendation.push("");
			finalRecommendation.push("Fattori considerati:");
			scheduleOptimizations.forEach(factor => {
				finalRecommendation.push(`  • ${factor}`);
			});
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
		finalRecommendation.push("📊 TABELLA CONVERSIONE FORMULAZIONI");
		finalRecommendation.push("-".repeat(50));
		finalRecommendation.push("Dose equivalenti per terapia sostitutiva:");
		finalRecommendation.push("");

		const caRef = currentDose;
		const hcDose = convertDoseBetweenFormulations(caRef, 'cortisone_acetate', 'hydrocortisone');
		const plenadrenDose = convertDoseBetweenFormulations(caRef, 'cortisone_acetate', 'plenadren');
		const efmodyDose = convertDoseBetweenFormulations(caRef, 'cortisone_acetate', 'efmody');

		finalRecommendation.push(`┌─────────────────────────┬──────────────┬─────────────┐`);
		finalRecommendation.push(`│ Formulazione            │ Dose eq.     │ Somm./die   │`);
		finalRecommendation.push(`├─────────────────────────┼──────────────┼─────────────┤`);
		finalRecommendation.push(`│ Cortone Acetato (IR)    │ ${caRef.toFixed(1)} mg    │ 2-3 volte   │`);
		finalRecommendation.push(`│ Idrocortisone (IR)      │ ${hcDose.toFixed(1)} mg    │ 3 volte     │`);
		finalRecommendation.push(`│ Plenadren (ER)          │ ${plenadrenDose.toFixed(1)} mg    │ 1 volta     │`);
		finalRecommendation.push(`│ Efmody (ER)             │ ${efmodyDose.toFixed(1)} mg    │ 2 volte     │`);
		finalRecommendation.push(`└─────────────────────────┴──────────────┴─────────────┘`);
		finalRecommendation.push("");
		finalRecommendation.push("💡 Note:");
		finalRecommendation.push("• Dosi ER ridotte per minore esposizione complessiva");
		finalRecommendation.push("• Conversioni da verificare individualmente");
		finalRecommendation.push("• Switch richiede supervisione specialistica");
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

	// Workflow state
	const [workflowStep, setWorkflowStep] = useState<'select-patient' | 'enter-record' | 'view-plan'>('select-patient');
	const [showDetailsView, setShowDetailsView] = useState(false);

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
					{currentPatient && workflowStep !== 'select-patient' && (
						<Button
							onClick={() => {
								setWorkflowStep('select-patient');
								setCurrentPatient(null);
								setProposedTherapy(null);
								setShowDetailsView(false);
							}}
							variant="outline"
						>
							🔄 Cambia Paziente
						</Button>
					)}
				</div>
			</header>

			<main className="flex-1 p-6">
				{/* STEP 1: SELECT PATIENT */}
				{workflowStep === 'select-patient' && (
					<div className="max-w-4xl mx-auto">
						<Card>
							<CardHeader>
								<CardTitle className="text-2xl">👤 Seleziona Paziente</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								{/* Patient search */}
								<div>
									<Input
										placeholder="🔍 Cerca paziente per nome o cognome..."
										value={patientSearchTerm}
										onChange={(e) => setPatientSearchTerm(e.target.value)}
										className="text-lg"
									/>
								</div>

								{/* Patient list */}
								<div className="space-y-3">
									{patients
										.filter(p =>
											patientSearchTerm === '' ||
											`${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearchTerm.toLowerCase())
										)
										.map((patient) => (
											<div
												key={patient.id}
												onClick={() => {
													setCurrentPatient(patient);
													setWorkflowStep('enter-record');
												}}
												className="border rounded-lg p-4 hover:bg-blue-50 cursor-pointer transition-colors"
											>
												<div className="flex items-center justify-between">
													<div>
														<h3 className="font-medium text-lg">
															{patient.firstName} {patient.lastName}
														</h3>
														<p className="text-sm text-gray-600">
															{patient.demographics.diagnosis} • {patient.demographics.age} anni
														</p>
													</div>
													<div className="text-right text-sm text-gray-500">
														<div>{patient.therapyHistory.length} terapie registrate</div>
														<div>Ultimo aggiornamento: {new Date(patient.lastUpdated).toLocaleDateString()}</div>
													</div>
												</div>
											</div>
										))}
								</div>

								{/* Add new patient */}
								<Button
									onClick={() => setShowPatientDialog(true)}
									className="w-full bg-green-600 hover:bg-green-700"
									size="lg"
								>
									➕ Aggiungi Nuovo Paziente
								</Button>
							</CardContent>
						</Card>
					</div>
				)}

				{/* STEP 2: ENTER RECORD */}
				{workflowStep === 'enter-record' && currentPatient && (
					<div className="max-w-4xl mx-auto">
						<Card>
							<CardHeader>
								<CardTitle className="text-2xl">
									📝 Inserisci Nuovo Record per {currentPatient.firstName} {currentPatient.lastName}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								<NewRecordForm
									onSubmit={(record) => {
										setRecords([...records, record]);
										setWorkflowStep('view-plan');
										runAlgorithm();
									}}
									currentPatient={currentPatient}
									extractedData={extractedData}
									setExtractedData={setExtractedData}
									imgLoading={imgLoading}
									ocrProgress={ocrProgress}
									handleImageUpload={handleImageUpload}
									inputUnits={inputUnits}
									setInputUnits={setInputUnits}
									formatDateInput={formatDateInput}
								/>
							</CardContent>
						</Card>
					</div>
				)}

				{/* STEP 3: VIEW PLAN */}
				{workflowStep === 'view-plan' && currentPatient && !showDetailsView && (
					<div className="max-w-6xl mx-auto space-y-6">
						{/* Therapy Comparison */}
						<Card>
							<CardHeader>
								<CardTitle className="text-2xl">💊 Piano Terapeutico</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="grid md:grid-cols-2 gap-6">
									{/* Current Therapy */}
									<div className="border rounded-lg p-4 bg-gray-50">
										<h3 className="text-lg font-semibold mb-4 text-gray-700">Piano Attuale</h3>
										<TherapyPlanDisplay therapy={currentTherapy} />
									</div>

									{/* Proposed Therapy */}
									<div className="border rounded-lg p-4 bg-blue-50">
										<h3 className="text-lg font-semibold mb-4 text-blue-700">Piano Proposto</h3>
										{proposedTherapy ? (
											<TherapyPlanDisplay therapy={proposedTherapy} isProposed />
										) : (
											<div className="text-center py-8 text-gray-500">
												<p>Esegui l'algoritmo per vedere il piano proposto</p>
											</div>
										)}
									</div>
								</div>

								{/* Action buttons */}
								<div className="flex gap-3">
									<Button
										onClick={runAlgorithm}
										className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
										size="lg"
									>
										🧠 Calcola Piano Proposto
									</Button>
									{proposedTherapy && (
										<Button
											onClick={applyProposedTherapy}
											className="flex-1 bg-green-600 hover:bg-green-700"
											size="lg"
										>
											✅ Applica Piano Proposto
										</Button>
									)}
								</div>

								{/* Suggestion */}
								{suggestion && (
									<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
										<p className="text-sm text-amber-800 whitespace-pre-wrap">{suggestion}</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Formulation equivalences */}
						<Card>
							<CardHeader>
								<CardTitle>🔄 Equivalenze tra Formulazioni</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								<div>
									<h3 className="text-lg font-semibold mb-4 text-gray-700">Piano Attuale</h3>
									<FormulationEquivalences 
										currentDose={currentTherapy.cortisoneAcetate.morning + currentTherapy.cortisoneAcetate.midday + currentTherapy.cortisoneAcetate.evening} 
										title="Equivalenze per il dosaggio attuale"
									/>
								</div>
								{proposedTherapy && (
									<div className="border-t pt-6">
										<h3 className="text-lg font-semibold mb-4 text-blue-700">Piano Proposto</h3>
										<FormulationEquivalences 
											currentDose={proposedTherapy.cortisoneAcetate.morning + proposedTherapy.cortisoneAcetate.midday + proposedTherapy.cortisoneAcetate.evening} 
											title="Equivalenze per il dosaggio proposto"
										/>
									</div>
								)}
							</CardContent>
						</Card>

						{/* View details button */}
						<div className="text-center">
							<Button
								onClick={() => setShowDetailsView(true)}
								variant="outline"
								size="lg"
								className="px-8"
							>
								📊 Visualizza Dettagli Completi
							</Button>
						</div>

						{/* Quick actions */}
						<div className="flex gap-3">
							<Button
								onClick={() => setWorkflowStep('enter-record')}
								variant="outline"
								className="flex-1"
							>
								➕ Aggiungi Altro Record
							</Button>
							<Button
								onClick={() => setWorkflowStep('select-patient')}
								variant="outline"
								className="flex-1"
							>
								🔄 Cambia Paziente
							</Button>
						</div>
					</div>
				)}

				{/* DETAILS VIEW */}
				{showDetailsView && (
					<div className="max-w-7xl mx-auto">
						<div className="mb-4">
							<Button
								onClick={() => setShowDetailsView(false)}
								variant="outline"
							>
								← Torna alla Vista Principale
							</Button>
						</div>

						<Tabs defaultValue="records" className="flex flex-col">
							<TabsList className="self-start grid w-full grid-cols-8">
								<TabsTrigger value="records">Records</TabsTrigger>
								<TabsTrigger value="patient">👤 Paziente</TabsTrigger>
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
														<TableHead>Cort 24h</TableHead>
														<TableHead>Cort 1.5h</TableHead>
														<TableHead>Renina</TableHead>
														<TableHead>PA sup sys</TableHead>
														<TableHead>PA sup dia</TableHead>
														<TableHead>PA ort sys</TableHead>
														<TableHead>PA ort dia</TableHead>
														<TableHead>Glicemia</TableHead>
														<TableHead>Ipoglic.</TableHead>
														<TableHead>Sale</TableHead>
														<TableHead>Vert</TableHead>
														<TableHead>Glucocort.</TableHead>
														<TableHead>Florinef</TableHead>
														<TableHead>Altri Farm.</TableHead>
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
															<TableCell className={r.cortisolUrinary24h && r.cortisolUrinary24h > 100 ? "text-red-600 font-semibold" : ""}>
																{displayValue(r.cortisolUrinary24h, 'cortisol')}
															</TableCell>
															<TableCell className={r.cortisolPost90min && r.cortisolPost90min > 25 ? "text-red-600 font-semibold" : ""}>
																{displayValue(r.cortisolPost90min, 'cortisol')}
															</TableCell>
															<TableCell>{displayValue(r.renin, 'renin')}</TableCell>
															<TableCell>{displayValue(r.bpSupSys, 'bp')}</TableCell>
															<TableCell>{displayValue(r.bpSupDia, 'bp')}</TableCell>
															<TableCell>{displayValue(r.bpOrthSys, 'bp')}</TableCell>
															<TableCell>{displayValue(r.bpOrthDia, 'bp')}</TableCell>
															<TableCell className={r.glucose && r.glucose < 70 ? "text-red-600 font-semibold" : ""}>
																{r.glucose ? `${r.glucose} mg/dL` : "-"}
															</TableCell>
															<TableCell>{r.hypoglycemia ? "Sì" : "No"}</TableCell>
															<TableCell>{r.craveSalt ? "Sì" : "No"}</TableCell>
															<TableCell>{r.vertigo ? "Sì" : "No"}</TableCell>
															<TableCell className="text-xs max-w-[120px] truncate" title={r.glucocorticoidDose || ""}>
																{r.glucocorticoidDose || "-"}
															</TableCell>
															<TableCell className="text-xs" title={r.florinefDose || ""}>
																{r.florinefDose || "-"}
															</TableCell>
															<TableCell className="text-xs max-w-[120px] truncate" title={r.otherMedications || ""}>
																{r.otherMedications || "-"}
															</TableCell>
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

										{/* Nuova sezione: Monitoraggio Sovradosaggio Glucocorticoidi */}
										<div>
											<h3 className="font-medium text-purple-800 mb-3 bg-purple-50 p-2 rounded">
												⚠️ Monitoraggio Sovradosaggio Glucocorticoidi
											</h3>
											<div className="space-y-3">
												<div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
													<div className="font-medium text-purple-800 mb-3">
														📌 Parametri per valutare il sovradosaggio della terapia con glucocorticoidi:
													</div>
													<div className="space-y-3">
														<div className="bg-white p-3 rounded border border-purple-200">
															<div className="font-semibold text-purple-900">Cortisolo libero urinario 24h</div>
															<div className="text-lg font-bold text-purple-600 mt-1">10-100 μg/24h</div>
															<div className="text-sm text-gray-600 mt-1">(28-276 nmol/24h)</div>
															<div className="text-sm text-red-600 mt-2 font-medium">
																⚠️ Valori elevati (&gt;100 μg/24h) indicano possibile sovradosaggio
															</div>
														</div>
														<div className="bg-white p-3 rounded border border-purple-200">
															<div className="font-semibold text-purple-900">Cortisolo post-dose (1.5h dopo farmaco)</div>
															<div className="text-lg font-bold text-purple-600 mt-1">&lt;20 μg/dL</div>
															<div className="text-sm text-gray-600 mt-1">(&lt;552 nmol/L)</div>
															<div className="text-sm text-red-600 mt-2 font-medium">
																⚠️ Valori &gt;25 μg/dL (&gt;690 nmol/L) indicano possibile sovradosaggio
															</div>
														</div>
													</div>
													<div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded text-sm">
														<p className="font-medium text-yellow-900">💡 Nota clinica:</p>
														<p className="text-yellow-800 mt-1">
															Se entrambi i parametri risultano elevati, è necessario rivalutare il dosaggio
															della terapia con glucocorticoidi in collaborazione con l'endocrinologo.
														</p>
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
					</div>
				)}
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

										{/* Cortisolo libero urinario 24h */}
										<div>
											<label className="block text-sm font-medium mb-1">
												Cortisolo libero urinario 24h
												<span className="text-xs text-gray-500 ml-1">(sovradosaggio se elevato)</span>
											</label>
											<div className="flex gap-2">
												<Input
													name="cortUrinary24h"
													placeholder="Cortisolo 24h"
													className="flex-1"
													title="Valori elevati indicano possibile sovradosaggio di glucocorticoidi"
												/>
												<select
													className="border rounded px-2 py-1 text-xs"
													value={inputUnits.cortisol}
													onChange={(e) => setInputUnits({ ...inputUnits, cortisol: e.target.value as 'μg/dL' | 'nmol/L' })}
												>
													<option value="μg/dL">μg/24h</option>
													<option value="nmol/L">nmol/24h</option>
												</select>
											</div>
										</div>

										{/* Cortisolo post 90 min */}
										<div>
											<label className="block text-sm font-medium mb-1">
												Cortisolo (1.5h dopo farmaco)
												<span className="text-xs text-gray-500 ml-1">(sovradosaggio se elevato)</span>
											</label>
											<div className="flex gap-2">
												<Input
													name="cortPost90min"
													placeholder="Cortisolo post-dose"
													className="flex-1"
													title="Cortisolo dosato 1 ora e mezza dopo l'assunzione del farmaco. Valori elevati indicano possibile sovradosaggio"
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

								{/* Info sui nuovi parametri cortisolo per sovradosaggio */}
								<div className="border-t pt-4">
									<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
										<h4 className="font-semibold text-yellow-900 mb-2">
											ℹ️ Informazioni sui parametri di monitoraggio del cortisolo
										</h4>
										<div className="text-sm text-yellow-800 space-y-2">
											<p className="font-medium">
												I due nuovi parametri (Cortisolo libero urinario 24h e Cortisolo post 1.5h) servono per identificare un possibile sovradosaggio della terapia con glucocorticoidi.
											</p>
											<div className="mt-3">
												<p className="font-semibold mb-1">📊 Valori di riferimento e interpretazione:</p>
												<ul className="list-disc list-inside space-y-1 ml-2">
													<li><strong>Cortisolo libero urinario 24h:</strong>
														<ul className="list-circle list-inside ml-4 mt-1">
															<li>Range normale: 10-100 μg/24h (28-276 nmol/24h)</li>
															<li>⚠️ Valori elevati suggeriscono sovradosaggio</li>
														</ul>
													</li>
													<li><strong>Cortisolo 1.5h dopo farmaco:</strong>
														<ul className="list-circle list-inside ml-4 mt-1">
															<li>Valori attesi: {'<'}20 μg/dL ({'<'}552 nmol/L)</li>
															<li>⚠️ Valori {'>'}25 μg/dL ({'>'}690 nmol/L) indicano possibile sovradosaggio</li>
														</ul>
													</li>
												</ul>
											</div>
											<p className="mt-3 text-xs italic">
												💡 <strong>Hai bisogno di altri livelli di riferimento?</strong> Consulta la sezione "Valori di Riferimento" nel tab Dati per vedere tutti i range normali dei parametri di laboratorio.
											</p>
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
										<div>
											<label className="block text-sm font-medium mb-1">🩸 Glicemia</label>
											<div className="flex gap-2">
												<Input name="glucose" placeholder="es. 85" type="number" step="0.1" />
												<span className="text-xs self-center text-gray-600">mg/dL</span>
											</div>
											<div className="text-xs text-gray-600 mt-1">
												Range: 70-100 mg/dL (a digiuno)
											</div>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4 mt-4">
										<label className="flex items-center">
											<input type="checkbox" name="hypoglycemia" className="mr-2" />
											Episodi ipoglicemici recenti ({'<'}70 mg/dL)
										</label>
										<label className="flex items-center">
											<input type="checkbox" name="crave" className="mr-2" />
											Craving sale
										</label>
									</div>

									<div className="grid grid-cols-2 gap-4 mt-2">
										<label className="flex items-center">
											<input type="checkbox" name="vert" className="mr-2" />
											Vertigini
										</label>
									</div>
								</div>

								{/* Current Therapy Section */}
								<div className="border-t pt-4">
									<h3 className="font-medium text-purple-800 mb-3 bg-purple-50 p-2 rounded">
										💊 Terapia Attuale
									</h3>
									<div className="text-xs text-gray-600 mb-3">
										Inserisci la terapia in corso al momento degli esami per valutare l'adeguatezza del dosaggio ed eventuali interferenze farmacologiche.
									</div>

									<div className="grid grid-cols-1 gap-4">
										{/* Glucocorticoid Dose */}
										<div>
											<label className="block text-sm font-medium mb-1">
												💊 Dosaggio Glucocorticoide
											</label>
											<Input
												name="glucocorticoidDose"
												placeholder="es. Cortisone Acetato 25mg (12.5mg mattina + 12.5mg sera)"
												className="w-full"
											/>
											<div className="text-xs text-gray-500 mt-1">
												Specifica il tipo di glucocorticoide e la distribuzione giornaliera delle dosi
											</div>
										</div>

										{/* Florinef Dose */}
										<div>
											<label className="block text-sm font-medium mb-1">
												💧 Dosaggio Florinef (Fludrocortisone)
											</label>
											<Input
												name="florinefDose"
												placeholder="es. 0.1mg al mattino"
												className="w-full"
											/>
											<div className="text-xs text-gray-500 mt-1">
												Specifica il dosaggio e l'orario di assunzione
											</div>
										</div>

										{/* Other Medications */}
										<div>
											<label className="block text-sm font-medium mb-1">
												🔬 Altri Farmaci Assunti
											</label>
											<textarea
												name="otherMedications"
												placeholder="es. Levotiroxina 100mcg, Metformina 500mg, ecc.&#10;Elenca eventuali altri farmaci per valutare possibili interferenze"
												className="w-full border rounded px-3 py-2 text-sm min-h-[80px]"
											/>
											<div className="text-xs text-gray-500 mt-1">
												Include tutti i farmaci assunti regolarmente (per tiroide, diabete, pressione, ecc.)
											</div>
										</div>
									</div>

									<div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
										<p className="font-medium text-blue-900">💡 Perché è importante:</p>
										<ul className="text-blue-800 mt-1 space-y-1 list-disc list-inside">
											<li>Valutare se i valori ormonali sono coerenti con il dosaggio attuale</li>
											<li>Identificare possibili sovradosaggi o sottodosaggi</li>
											<li>Riconoscere interferenze farmacologiche (es. estrogeni, anticonvulsivanti, rifampicina)</li>
											<li>Ottimizzare la terapia in base ai risultati degli esami</li>
										</ul>
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

// ===== NEW RECORD FORM COMPONENT ===== //
function NewRecordForm({
	onSubmit,
	currentPatient,
	extractedData,
	setExtractedData,
	imgLoading,
	ocrProgress,
	handleImageUpload,
	inputUnits,
	setInputUnits,
	formatDateInput
}: {
	onSubmit: (record: PatientRecord) => void;
	currentPatient: PatientProfile;
	extractedData: any;
	setExtractedData: (data: any) => void;
	imgLoading: boolean;
	ocrProgress: number;
	handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
	inputUnits: UnitSystem;
	setInputUnits: (units: UnitSystem) => void;
	formatDateInput: (value: string) => string;
}) {
	const [newRecordDate, setNewRecordDate] = useState(() => {
		const today = new Date();
		const day = today.getDate().toString().padStart(2, '0');
		const month = (today.getMonth() + 1).toString().padStart(2, '0');
		const year = today.getFullYear();
		return `${day}/${month}/${year}`;
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);

		const getValue = (name: string): number | null => {
			const value = formData.get(name)?.toString();
			return value && value.trim() !== '' ? parseFloat(value) : null;
		};

		const record: PatientRecord = {
			date: newRecordDate,
			na: getValue('na'),
			k: getValue('k'),
			acth: getValue('acth'),
			cortisol: getValue('cort'),
			cortisolUrinary24h: getValue('cortUrinary24h'),
			cortisolPost90min: getValue('cortPost90min'),
			renin: getValue('renin'),
			bpSupSys: getValue('bpSupSys'),
			bpSupDia: getValue('bpSupDia'),
			bpOrthSys: getValue('bpOrthSys'),
			bpOrthDia: getValue('bpOrthDia'),
			glucose: getValue('glucose'),
			hypoglycemia: formData.get('hypoglycemia') === 'on',
			craveSalt: formData.get('crave') === 'on',
			vertigo: formData.get('vert') === 'on',
			glucocorticoidDose: formData.get('glucocorticoidDose')?.toString() || null,
			florinefDose: formData.get('florinefDose')?.toString() || null,
			otherMedications: formData.get('otherMedications')?.toString() || null,
			fatigue: getValue('fatigue'),
			moodChanges: getValue('moodChanges'),
			workCapacity: getValue('workCapacity'),
			socialLife: getValue('socialLife'),
			sleepQuality: getValue('sleepQuality'),
			physicalAppearance: getValue('physicalAppearance'),
			overallWellbeing: getValue('overallWellbeing'),
			treatmentSatisfaction: getValue('treatmentSatisfaction'),
		};

		onSubmit(record);
	};

	return (
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

			<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
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

						{/* Cortisolo libero urinario 24h */}
						<div>
							<label className="block text-sm font-medium mb-1">
								Cortisolo libero urinario 24h
								<span className="text-xs text-gray-500 ml-1">(sovradosaggio se elevato)</span>
							</label>
							<div className="flex gap-2">
								<Input
									name="cortUrinary24h"
									placeholder="Cortisolo 24h"
									className="flex-1"
									title="Valori elevati indicano possibile sovradosaggio di glucocorticoidi"
								/>
								<select
									className="border rounded px-2 py-1 text-xs"
									value={inputUnits.cortisol}
									onChange={(e) => setInputUnits({ ...inputUnits, cortisol: e.target.value as 'μg/dL' | 'nmol/L' })}
								>
									<option value="μg/dL">μg/24h</option>
									<option value="nmol/L">nmol/24h</option>
								</select>
							</div>
						</div>

						{/* Cortisolo post 90 min */}
						<div>
							<label className="block text-sm font-medium mb-1">
								Cortisolo (1.5h dopo farmaco)
								<span className="text-xs text-gray-500 ml-1">(sovradosaggio se elevato)</span>
							</label>
							<div className="flex gap-2">
								<Input
									name="cortPost90min"
									placeholder="Cortisolo post-dose"
									className="flex-1"
									title="Cortisolo dosato 1 ora e mezza dopo l'assunzione del farmaco. Valori elevati indicano possibile sovradosaggio"
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

				{/* Info sui nuovi parametri cortisolo per sovradosaggio */}
				<div className="border-t pt-4">
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<h4 className="font-semibold text-yellow-900 mb-2">
							ℹ️ Informazioni sui parametri di monitoraggio del cortisolo
						</h4>
						<div className="text-sm text-yellow-800 space-y-2">
							<p className="font-medium">
								I due nuovi parametri (Cortisolo libero urinario 24h e Cortisolo post 1.5h) servono per identificare un possibile sovradosaggio della terapia con glucocorticoidi.
							</p>
							<div className="mt-3">
								<p className="font-semibold mb-1">📊 Valori di riferimento e interpretazione:</p>
								<ul className="list-disc list-inside space-y-1 ml-2">
									<li><strong>Cortisolo libero urinario 24h:</strong>
										<ul className="list-circle list-inside ml-4 mt-1">
											<li>Range normale: 10-100 μg/24h (28-276 nmol/24h)</li>
											<li>⚠️ Valori elevati suggeriscono sovradosaggio</li>
										</ul>
									</li>
									<li><strong>Cortisolo 1.5h dopo farmaco:</strong>
										<ul className="list-circle list-inside ml-4 mt-1">
											<li>Valori attesi: {'<'}20 μg/dL ({'<'}552 nmol/L)</li>
											<li>⚠️ Valori {'>'}25 μg/dL ({'>'}690 nmol/L) indicano possibile sovradosaggio</li>
										</ul>
									</li>
								</ul>
							</div>
							<p className="mt-3 text-xs italic">
								💡 <strong>Hai bisogno di altri livelli di riferimento?</strong> Consulta la sezione "Valori di Riferimento" nel tab Dati per vedere tutti i range normali dei parametri di laboratorio.
							</p>
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
						<div>
							<label className="block text-sm font-medium mb-1">🩸 Glicemia</label>
							<div className="flex gap-2">
								<Input name="glucose" placeholder="es. 85" type="number" step="0.1" />
								<span className="text-xs self-center text-gray-600">mg/dL</span>
							</div>
							<div className="text-xs text-gray-600 mt-1">
								Range: 70-100 mg/dL (a digiuno)
							</div>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4 mt-4">
						<label className="flex items-center">
							<input type="checkbox" name="hypoglycemia" className="mr-2" />
							Episodi ipoglicemici recenti ({'<'}70 mg/dL)
						</label>
						<label className="flex items-center">
							<input type="checkbox" name="crave" className="mr-2" />
							Craving sale
						</label>
					</div>

					<div className="grid grid-cols-2 gap-4 mt-2">
						<label className="flex items-center">
							<input type="checkbox" name="vert" className="mr-2" />
							Vertigini
						</label>
					</div>
				</div>

				{/* Current Therapy Section */}
				<div className="border-t pt-4">
					<h3 className="font-medium text-purple-800 mb-3 bg-purple-50 p-2 rounded">
						💊 Terapia Attuale
					</h3>
					<div className="text-xs text-gray-600 mb-3">
						Inserisci la terapia in corso al momento degli esami per valutare l'adeguatezza del dosaggio ed eventuali interferenze farmacologiche.
					</div>

					<div className="grid grid-cols-1 gap-4">
						{/* Glucocorticoid Dose */}
						<div>
							<label className="block text-sm font-medium mb-1">
								💊 Dosaggio Glucocorticoide
							</label>
							<Input
								name="glucocorticoidDose"
								placeholder="es. Cortisone Acetato 25mg (12.5mg mattina + 12.5mg sera)"
								className="w-full"
							/>
							<div className="text-xs text-gray-500 mt-1">
								Specifica il tipo di glucocorticoide e la distribuzione giornaliera delle dosi
							</div>
						</div>

						{/* Florinef Dose */}
						<div>
							<label className="block text-sm font-medium mb-1">
								💧 Dosaggio Florinef (Fludrocortisone)
							</label>
							<Input
								name="florinefDose"
								placeholder="es. 0.1mg al mattino"
								className="w-full"
							/>
							<div className="text-xs text-gray-500 mt-1">
								Specifica il dosaggio e l'orario di assunzione
							</div>
						</div>

						{/* Other Medications */}
						<div>
							<label className="block text-sm font-medium mb-1">
								🔬 Altri Farmaci Assunti
							</label>
							<textarea
								name="otherMedications"
								placeholder="es. Levotiroxina 100mcg, Metformina 500mg, ecc.&#10;Elenca eventuali altri farmaci per valutare possibili interferenze"
								className="w-full border rounded px-3 py-2 text-sm min-h-[80px]"
							/>
							<div className="text-xs text-gray-500 mt-1">
								Include tutti i farmaci assunti regolarmente (per tiroide, diabete, pressione, ecc.)
							</div>
						</div>
					</div>

					<div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
						<p className="font-medium text-blue-900">💡 Perché è importante:</p>
						<ul className="text-blue-800 mt-1 space-y-1 list-disc list-inside">
							<li>Valutare se i valori ormonali sono coerenti con il dosaggio attuale</li>
							<li>Identificare possibili sovradosaggi o sottodosaggi</li>
							<li>Riconoscere interferenze farmacologiche (es. estrogeni, anticonvulsivanti, rifampicina)</li>
							<li>Ottimizzare la terapia in base ai risultati degli esami</li>
						</ul>
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
				</div>
			</form>
		</div>
	);
}

// ===== THERAPY PLAN DISPLAY COMPONENT ===== //
function TherapyPlanDisplay({
	therapy,
	isProposed = false
}: {
	therapy: CurrentTherapy;
	isProposed?: boolean;
}) {
	const totalCortisone = therapy.cortisoneAcetate.morning +
		therapy.cortisoneAcetate.midday +
		therapy.cortisoneAcetate.evening;

	return (
		<div className="space-y-4">
			<div>
				<h4 className="font-medium mb-2">Cortisone Acetato</h4>
				<div className="space-y-2 text-sm">
					<div className="flex justify-between">
						<span>☀️ Mattina:</span>
						<span className="font-semibold">{therapy.cortisoneAcetate.morning} mg</span>
					</div>
					<div className="flex justify-between">
						<span>🌤️ Mezzogiorno:</span>
						<span className="font-semibold">{therapy.cortisoneAcetate.midday} mg</span>
					</div>
					<div className="flex justify-between">
						<span>🌙 Sera:</span>
						<span className="font-semibold">{therapy.cortisoneAcetate.evening} mg</span>
					</div>
					<div className="border-t pt-2 flex justify-between font-bold">
						<span>Totale:</span>
						<span>{totalCortisone} mg/die</span>
					</div>
				</div>
			</div>
			<div className="border-t pt-3">
				<div className="flex justify-between">
					<span className="font-medium">Florinef:</span>
					<span className="font-semibold">{therapy.florinef} mg</span>
				</div>
			</div>
		</div>
	);
}

// ===== FORMULATION EQUIVALENCES COMPONENT ===== //
function FormulationEquivalences({
	currentDose,
	title
}: {
	currentDose: number;
	title?: string;
}) {
	const formulations = [
		{
			name: 'Cortisone Acetato',
			type: 'IR',
			factor: 1.0,
			color: 'bg-blue-50',
		},
		{
			name: 'Idrocortisone (IR)',
			type: 'IR',
			factor: 0.8,
			color: 'bg-green-50',
		},
		{
			name: 'Idrocortisone ER (Plenadren)',
			type: 'ER',
			factor: 0.8,
			color: 'bg-purple-50',
		},
		{
			name: 'Prednisone',
			type: 'IR',
			factor: 0.2,
			color: 'bg-yellow-50',
		},
		{
			name: 'Prednisolone',
			type: 'IR',
			factor: 0.2,
			color: 'bg-orange-50',
		},
	];

	return (
		<div className="space-y-3">
			<p className="text-sm text-gray-600">
				{title || `Dose equivalente a`} <strong>{currentDose} mg di Cortisone Acetato</strong>:
			</p>
			<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
				{formulations.map((form, idx) => {
					const equivalentDose = (currentDose * form.factor).toFixed(1);
					return (
						<div key={idx} className={`${form.color} border rounded-lg p-4`}>
							<div className="font-medium text-sm mb-1">{form.name}</div>
							<div className="text-lg font-bold text-blue-700">{equivalentDose} mg</div>
							<div className="text-xs text-gray-600 mt-1">{form.type}</div>
						</div>
					);
				})}
			</div>
			<div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
				<h4 className="font-medium text-amber-800 mb-2">💡 Formulazione più idonea</h4>
				<p className="text-sm text-amber-700">
					Per una copertura più fisiologica del ritmo circadiano del cortisolo,
					<strong> Idrocortisone ER (Plenadren)</strong> rappresenta la formulazione di elezione.
					Permette una singola somministrazione mattutina con rilascio prolungato che mima
					il ritmo naturale del cortisolo.
				</p>
				<div className="mt-2 text-xs text-amber-600">
					<strong>Vantaggi:</strong> Migliore QoL, ridotto carico di pillole, ritmo circadiano più fisiologico
				</div>
			</div>
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