import { NextResponse } from "next/server"

const PMS_API_URL = "https://pms-backend-kohl.vercel.app/api/v1/external/patients"
const PMS_API_KEY = process.env.PMS_API_KEY

export interface ExternalPatient {
  patient_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  contact_number: string
  email_address: string
  address: string
  national_id: string
  status: string
  visit_count: number
  last_visit_date: string | null
  attending_physician: string
  insurance: {
    provider: string
    coverage_percentage: number
    policy_number: string
    group_number: string
  }
  registration_date: string
  updated_at: string
}

export interface PatientsApiResponse {
  status: string
  results_per_page: number
  total_results: number
  total_pages: number
  current_page: number
  patients: ExternalPatient[]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page") || "1"
    const limit = searchParams.get("limit") || "20"
    const search = searchParams.get("search") || ""

    const url = new URL(PMS_API_URL)
    url.searchParams.set("page", page)
    url.searchParams.set("limit", limit)
    if (search) {
      url.searchParams.set("search", search)
    }

    const response = await fetch(url.toString(), {
      headers: {
        "x-api-key": PMS_API_KEY as string,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch patients from external API" },
        { status: response.status }
      )
    }

    const data: PatientsApiResponse = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching patients:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
