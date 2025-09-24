# 📄 Demo Files per AddiDose++ Import System

Questi file dimostrano le capacità di importazione automatica del sistema AddiDose++.

## 🎯 **Come usare i file demo:**

1. **Avvia il sistema** e vai al tab "👤 Paziente"
2. **Clicca "📄 Importa Documenti"**
3. **Carica uno o più file demo** dalla cartella `demo-files/`
4. **Osserva l'elaborazione automatica** con estrazione intelligente dei dati

## 📁 **File disponibili:**

### `referto-mario-rossi.txt`
- **Tipo:** Referto medico strutturato
- **Paziente:** Mario Rossi, 44 anni, M
- **Contenuto:** Dati demografici completi, terapia attuale, esami lab, comorbidità
- **Confidence attesa:** ~85-90%

### `storia-clinica-laura.json`
- **Tipo:** Storia clinica strutturata JSON
- **Paziente:** Laura Verdi, 40 anni, F
- **Contenuto:** Profilo completo con storia terapeutica dettagliata e risultati lab
- **Confidence attesa:** ~95%

### `lab-results-giulia.csv`
- **Tipo:** Risultati laboratorio CSV
- **Paziente:** Giulia Neri, 35 anni, F
- **Contenuto:** Serie temporale di esami con evoluzione terapeutica
- **Confidence attesa:** ~75-80%

### `diario-marco.txt`
- **Tipo:** Diario terapeutico libero
- **Paziente:** Marco Bianchi, 52 anni, M
- **Contenuto:** Storia complessa con multiple variazioni terapeutiche
- **Confidence attesa:** ~70-80%

## 🧠 **Funzionalità dimostrate:**

- ✅ **Parsing intelligente** di formati diversi (TXT, JSON, CSV)
- ✅ **Estrazione automatica** di dati demografici
- ✅ **Riconoscimento terapie** con dosaggi e distribuzioni
- ✅ **Identificazione comorbidità** comuni
- ✅ **Analisi risultati lab** con unità di misura
- ✅ **Creazione automatica** profilo paziente
- ✅ **Confidence scoring** basato su qualità dati
- ✅ **Merge intelligente** di informazioni multiple

## 🎨 **Test avanzati:**

1. **Carica tutti i file insieme** → Osserva come il sistema gestisce pazienti multipli
2. **Carica solo `storia-clinica-laura.json`** → Profilo automatico ad alta confidence
3. **Combina `referto-mario-rossi.txt` + immagine OCR** → Parsing multi-formato
4. **Testa file corrotti** → Gestione errori robusta

## 📊 **Metriche di successo:**

- **Dati demografici:** Estratti con precisione >90%
- **Terapie:** Riconosciute e strutturate correttamente
- **Lab results:** Parsati con unità appropriate
- **Confidence:** Riflette accuratamente la qualità dell'estrazione
- **Auto-merge:** Crea profili pazienti utilizzabili immediatamente

---

**🔧 Sviluppato per AddiDose++ v3.0 - Sistema AI-Enhanced**