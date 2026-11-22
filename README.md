# Extract PDF – PDF Report Data Extraction

A full-stack application that allows users to upload laboratory report PDFs, extract report identifiers and test parameters, store the extracted information in PostgreSQL, and view the reports through a web interface.

## Features

- Upload laboratory report PDFs through the web interface.
- Validate uploaded files and reject invalid or corrupted PDFs.
- Extract text from text-based PDFs using PDF.js.
- Use OCR as a fallback for scanned PDFs when no report parameters are found through text   extraction.
- Extract report ID, sample ID, parameter names, results, units, and reference ranges.
- Store reports and their parameters in PostgreSQL.
- Detect duplicate PDF uploads using SHA-256 file hashing.
- View all successfully processed reports.
- Open an individual report and view its extracted parameters in a structured table.
- Support different numbers of parameters across reports.

## Technology Stack

 Layer                              Technology 

 Frontend                           Next.js, React, TypeScript
 Backend                            NestJS, TypeScript
 Database                           PostgreSQL
 ORM                                Prisma
 PDF text extraction                PDF.js
 OCR                                Tesseract.js
 PDF rendering for OCR              @napi-rs/canvas
 File upload                        Multer

## Application Workflow

1. The user selects and uploads a PDF through the Next.js application.
2. The NestJS backend validates the file type, extension, and PDF signature.
3. The backend calculates a SHA-256 hash to check whether the same PDF has already been uploaded.
4. If the file is new, it is temporarily saved in the backend uploads directory.
5. PDF.js attempts to extract text from the PDF.
6. The extracted text is parsed to identify report identifiers and parameter details.
7. If no report parameters are found, the application attempts OCR using Tesseract.js.
8. The extracted report and parameter information are stored in PostgreSQL using Prisma.
9. The frontend displays the completed reports.
10. When a user selects a report, its details and parameters are displayed on a separate page.

## PDF Extraction Approach

### 1. Text-based PDF extraction

The application first uses PDF.js to extract text from the PDF.

The extracted text is processed to identify:

- Report ID
- Sample ID
- Parameter name
- Result/value
- Unit
- Reference range

Parameter values are stored as strings so that numeric and non-numeric results can both be represented.

### 2. 
Some PDFs contain scanned images instead of selectable text.

When the normal text extraction process does not identify any report parameters:

- PDF.js renders the PDF pages.
- `@napi-rs/canvas` converts the pages into images.
- Tesseract.js performs OCR on those images.
- The recognized text is parsed to extract report parameters.

**Current scope:** The application uses OCR as a fallback when no parameters are found through normal text extraction. PDFs containing a mixture of text-based and scanned content are not fully supported yet.

## Database Design

The application uses two main database models.

### Report

Stores the uploaded PDF's metadata and processing information.

Field                     Description

id                        Primary key
reportId                  Report identifier extracted from the PDF; nullable
sampleId                  Sample identifier extracted from the PDF; nullable 
originalFilename          Original uploaded filename
fileHash                  SHA-256 hash used for duplicate detection
filePath                  Stored PDF file location
status                    Processing status
createdAt                 Upload timestamp

### ReportParameter

Stores the extracted parameters associated with a report.

Field             Description
id                Primary key
reportDbId        Foreign key referencing Report
parameterName     Name of the test parameter 
value             Extracted result, stored as a string
unit              Measurement unit; nullable 
referenceRange    Reference range; nullable
displayOrder      Original parameter order
pageNumber        PDF page number; nullable 

### Relationship

One report can have multiple parameters.

`Report (1) → ReportParameter (Many)`

The report ID and sample ID are nullable because some PDFs may not contain these identifiers. The file hash is unique to prevent duplicate uploads.

## API Endpoints

Method  Endpoint            Description

POST   `/reports/upload`    Upload and process a PDF 
GET    `/reports`           Retrieve all completed reports 
GET    `/reports/:id`       Retrieve one report with its parameters 

### Upload API

- Endpoint: `POST /reports/upload`
- Content type: `multipart/form-data`
- Field name: `file`
- Maximum upload size: 10 MB

## Edge Cases Considered

Scenario                         Application behavior 

Scanned PDF                      Attempts OCR when normal text extraction finds no parameters 
Missing report ID or sample ID   Stores the missing identifier as `null` 
Missing unit or reference range  Stores the missing field as `null` 
Non-numeric results              Stores values such as `<150`, `Positive`, `Negative`, and `Nil`  
                                 as strings 
Duplicate PDF                    Detects duplicate content using SHA-256 and returns HTTP 409 
Multi-page PDF                   Extracts parameters across pages when the supported table layout 
                                 is detected 
Non-PDF file                     Rejects the upload 
Corrupted PDF                    Rejects the upload with an appropriate error 
No extractable parameters        Rejects the report and attempts to clean up the uploaded file 

## Current Limitations

- Mixed PDFs containing both text-based and scanned report content are not fully supported.
- The extraction logic is designed around the supported laboratory report layouts and may need adjustments for significantly different formats.
- Multi-page table continuation without a repeated table header has not been fully verified.
- OCR accuracy can vary depending on image quality, scan resolution, and document layout.

## Running the Application Locally

### Prerequisites

- Node.js
- npm
- PostgreSQL

### 1. Clone the repository

```bash
git clone https://github.com/VangavarapuAnitha/extract-pdf.git
cd extract-pdf
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL="postgresql://postgres:<YOUR_PASSWORD>@localhost:5433/extract_pdf_db?schema=public"
PORT=3000
```

Update the database username, password, port, and database name according to your PostgreSQL configuration.

Run the database migrations and generate the Prisma client:

```bash
npx prisma migrate deploy
npx prisma generate
```

Start the backend:

```bash
npm run start:dev
```

The backend runs at:

`http://localhost:3000`

### 3. Set up the frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Start the frontend:

```bash
npm run dev -- -p 3001
```

The frontend runs at:

`http://localhost:3001`

### 4. Use the application

1. Open `http://localhost:3001`.
2. Upload a supported laboratory report PDF.
3. Wait for extraction and processing to complete.
4. View the uploaded report in the reports list.
5. Select a report to view its extracted details and parameters.

## Assumptions

- The application is initially designed for laboratory report PDFs.
- Report ID and sample ID may be absent from a report.
- Parameter values are stored as strings to support numeric and non-numeric results.
- Units and reference ranges are optional.
- Uploaded files are limited to 10 MB.
- The initial implementation prioritizes text-based PDFs and scanned PDFs handled through OCR fallback.

## AI Tools Used

ChatGPT was used as a development assistant for understanding technical concepts, discussing implementation approaches, troubleshooting errors, and reviewing the application workflow.

All implementation decisions and code should be understood and explainable by the developer.

## Demo Video

**Demo video:** `https://drive.google.com/file/d/1DWvgBY_2Xn2e6SbHuU3PEsZFdfBfifkj/view?usp=sharing`

