"use client"

import { useState, useCallback } from "react"
import { ProgressSteps } from "./progress-steps"
import { SelectPatient } from "./steps/select-patient"
import { ChargeEntry } from "./steps/charge-entry"
import { TaxComputation } from "./steps/tax-computation"
import { GenerateInvoice } from "./steps/generate-invoice"
import { ProcessPayment } from "./steps/process-payment"
import { GenerateReceipt } from "./steps/generate-receipt"
import type {
  Patient,
  ChargeEntry as ChargeEntryType,
  TaxComputation as TaxComputationType,
  Invoice,
  Payment,
} from "@/lib/types"

const STEPS = [
  "Select Patient",
  "Charge Entry",
  "Tax Computation",
  "Generate Invoice",
  "Process Payment",
  "Receipt",
]

interface BillingWizardProps {
  onBillCreated?: () => void
}

export function BillingWizard({ onBillCreated }: BillingWizardProps = {}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [chargeEntry, setChargeEntry] = useState<ChargeEntryType | null>(null)
  const [taxComputation, setTaxComputation] = useState<TaxComputationType | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)

  const handleUpdateChargeEntry = useCallback((entry: ChargeEntryType) => {
    setChargeEntry(entry)
  }, [])

  const handleUpdateTaxComputation = useCallback((computation: TaxComputationType) => {
    setTaxComputation(computation)
  }, [])

  const handleUpdateInvoice = useCallback((inv: Invoice) => {
    setInvoice(inv)
  }, [])

  const handleUpdatePayment = useCallback((pay: Payment) => {
    setPayment(pay)
  }, [])

  const goToNextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const resetWizard = () => {
    setCurrentStep(1)
    setSelectedPatient(null)
    setChargeEntry(null)
    setTaxComputation(null)
    setInvoice(null)
    setPayment(null)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <SelectPatient
            selectedPatient={selectedPatient}
            onSelectPatient={setSelectedPatient}
            onNext={goToNextStep}
          />
        )
      case 2:
        return selectedPatient ? (
          <ChargeEntry
            patient={selectedPatient}
            chargeEntry={chargeEntry}
            onUpdateChargeEntry={handleUpdateChargeEntry}
            onBack={goToPreviousStep}
            onNext={goToNextStep}
          />
        ) : null
      case 3:
        return chargeEntry && selectedPatient ? (
          <TaxComputation
            patient={selectedPatient}
            chargeEntry={chargeEntry}
            taxComputation={taxComputation}
            onUpdateTaxComputation={handleUpdateTaxComputation}
            onBack={goToPreviousStep}
            onNext={goToNextStep}
          />
        ) : null
      case 4:
        return selectedPatient && chargeEntry && taxComputation ? (
          <GenerateInvoice
            patient={selectedPatient}
            chargeEntry={chargeEntry}
            taxComputation={taxComputation}
            invoice={invoice}
            onUpdateInvoice={handleUpdateInvoice}
            onBack={goToPreviousStep}
            onNext={goToNextStep}
          />
        ) : null
      case 5:
        return invoice ? (
          <ProcessPayment
            invoice={invoice}
            payment={payment}
            onUpdatePayment={handleUpdatePayment}
            onBack={goToPreviousStep}
            onNext={goToNextStep}
          />
        ) : null
      case 6:
        return invoice && payment ? (
          <GenerateReceipt
            invoice={invoice}
            payment={payment}
            onNewTransaction={resetWizard}
            onBillCreated={onBillCreated}
          />
        ) : null
      default:
        return null
    }
  }

  return (
    <div>
      <ProgressSteps currentStep={currentStep} totalSteps={STEPS.length} steps={STEPS} />
      {renderStep()}
    </div>
  )
}
