// @ts-ignore
import PdfPrinter = require('pdfmake');
import path from 'path';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import User from '../models/User';
import Company from '../models/Company';

const fonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};

const printer = new PdfPrinter(fonts);

export const generateCheckoutPDF = async (checkoutData: any, userData: any, assetsData: any): Promise<Buffer> => {
    return new Promise(async (resolve, reject) => {
        // Read logo image - Updated to handle logo loading without fs dependency
        let logoBase64 = '';
        try {
            // Try to load logo from file system (if available)
            const fs = require('fs');
            const logoPath = path.join(process.cwd(), 'src', 'assets', 'logo.png');
            const altLogoPath = path.join(process.cwd(), 'backend', 'src', 'assets', 'logo.png');

            let finalLogoPath = '';
            if (fs.existsSync(logoPath)) {
                finalLogoPath = logoPath;
            } else if (fs.existsSync(altLogoPath)) {
                finalLogoPath = altLogoPath;
            }

            if (finalLogoPath) {
                const logoBuffer = fs.readFileSync(finalLogoPath);
                logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
            }
        } catch (error) {
            console.error('Error loading logo for PDF:', error);
        }

        // Prepare paths - Remove local file storage logic
        const fileName = `Checkout_Report_${userData.username || 'Employee'}_${Date.now()}.pdf`;

        // Helper: robustly get the name of the person who handled a step
        const getHandledByName = async (completedById: string): Promise<string> => {
            try {
                if (!completedById) return '-';

                // 1. Try finding a User (e.g. Dept Admin)
                const user = await User.findById(completedById).lean();
                if (user && user.username) return user.username;

                // 2. Try finding a Company/Super Admin
                const company = await Company.findById(completedById).lean();
                if (company) {
                    // Start with contact name, fallback to company name
                    return company.contactName || company.companyName || 'Super Admin';
                }

                return 'System Admin';
            } catch (error) {
                return 'System';
            }
        };

        // Prepare steps data: Filter out Step 9, get proper names
        // Step 9 is "Email Report", which is an action, not a verification step for the PDF.
        // Prepare steps data: Filter out Step 9, get proper names
        // Step 9 is "Email Report", which is an action, not a verification step for the PDF.
        const offboardingSteps = await Promise.all(
            checkoutData.steps
                .filter((step: any) => {
                    const idx = Number(step.stepIndex);
                    // Strictly exclude Step 9 and above, or the Email Report step
                    return idx < 9 && step.title !== 'Email Report & Confirmation';
                })
                .map(async (step: any) => {
                    const handledBy = step.status === 'Completed' && step.completedBy
                        ? await getHandledByName(step.completedBy.toString())
                        : '-';

                    return [
                        { text: step.stepIndex.toString(), alignment: 'center', style: 'tableCell' },
                        { text: step.title, style: 'tableCell' },
                        {
                            text: step.status === 'Completed' ? 'COMPLETED' : 'PENDING',
                            color: step.status === 'Completed' ? '#059669' : '#dc2626', // Green-600 : Red-600
                            bold: true,
                            style: 'tableCell',
                            fontSize: 7
                        },
                        { text: handledBy, style: 'tableCell' },
                        {
                            text: step.completedAt ? new Date(step.completedAt).toLocaleDateString() : '-',
                            style: 'tableCell',
                            alignment: 'right'
                        }
                    ];
                })
        );

        // Build Asset Rows
        const assetRows: any[] = [];

        // -- Hardware
        if (assetsData.hardware && assetsData.hardware.length > 0) {
            assetsData.hardware.forEach((alloc: any) => {
                const name = alloc.hardwareAssetId?.assetName || 'Hardware Asset';
                const details = [
                    alloc.hardwareAssetId?.brand,
                    alloc.hardwareAssetId?.assetModel,
                    alloc.hardwareAssetId?.serialNumber ? `(S/N: ${alloc.hardwareAssetId.serialNumber})` : null
                ].filter(Boolean).join(' ');

                assetRows.push([
                    {
                        stack: [
                            { text: name, bold: true },
                            { text: details, fontSize: 7, color: '#6b7280', margin: [0, 2, 0, 0] }
                        ],
                        style: 'tableCell'
                    },
                    {
                        text: (alloc.status === 'DELETED' || alloc.status === 'RETURNED') ? 'RETURNED' : alloc.status,
                        color: (alloc.status === 'DELETED' || alloc.status === 'RETURNED') ? '#059669' : '#dc2626',
                        bold: true,
                        style: 'tableCell',
                        fontSize: 7
                    },
                    {
                        text: alloc.remarks || 'Returned to inventory',
                        style: 'tableCell',
                        color: '#4b5563'
                    }
                ]);
            });
        }

        // -- Software
        if (assetsData.software && assetsData.software.length > 0) {
            assetsData.software.forEach((alloc: any) => {
                const name = alloc.softwareAssetId?.softwareName || 'Software License';
                const details = [
                    alloc.softwareAssetId?.vendor,
                    alloc.licenseCount ? `${alloc.licenseCount} License(s)` : null
                ].filter(Boolean).join(' - ');

                assetRows.push([
                    {
                        stack: [
                            { text: name, bold: true },
                            { text: details, fontSize: 7, color: '#6b7280', margin: [0, 2, 0, 0] }
                        ],
                        style: 'tableCell'
                    },
                    {
                        text: (alloc.status === 'DELETED' || alloc.status === 'EXPIRED') ? 'REVOKED' : alloc.status,
                        color: (alloc.status === 'DELETED' || alloc.status === 'EXPIRED') ? '#059669' : '#dc2626',
                        bold: true,
                        style: 'tableCell',
                        fontSize: 7
                    },
                    {
                        text: alloc.remarks || 'Access revoked',
                        style: 'tableCell',
                        color: '#4b5563'
                    }
                ]);
            });
        }

        // -- Empty State - REMOVED
        // if (assetRows.length === 0) { ... }

        // Determine Final Status label for the report
        const reportStatus = 'COMPLETED';

        const content: any[] = [
            // Header Region
            {
                columns: [
                    {
                        width: '*',
                        stack: [
                            logoBase64 ? {
                                image: logoBase64,
                                width: 80,
                                margin: [0, 0, 0, 10]
                            } : { text: '' },
                            
                        ]
                    },
                    {
                        width: 'auto',
                        text: reportStatus,
                        fontSize: 10,
                        bold: true,
                        color: '#059669', // Green
                        alignment: 'right',
                        margin: [0, 5, 0, 0]
                    }
                ],
                margin: [0, 0, 0, 20]
            },

            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 20] },

            // Employee Info Section
            {
                style: 'tableWrapper',
                table: {
                    widths: ['25%', '75%'],
                    body: [
                        [
                            { text: 'EMPLOYEE NAME', style: 'fieldLabel' },
                            { text: userData.username || 'N/A', style: 'fieldValue', bold: true }
                        ],
                        [
                            { text: 'OFFICIAL EMAIL', style: 'fieldLabel' },
                            { text: userData.email || 'N/A', style: 'fieldValue' }
                        ]
                    ]
                },
                layout: 'noBorders'
            },

            { text: '', margin: [0, 0, 0, 20] }, // Spacer

            // Steps Section
            { text: 'PROCESS CHECKLIST', style: 'sectionHeader' },
            {
                style: 'tableWrapper',
                table: {
                    headerRows: 1,
                    widths: [20, '*', 60, 100, 60],
                    body: [
                        [
                            { text: 'S.No', style: 'tableHeader', alignment: 'center' },
                            { text: 'STEP', style: 'tableHeader' },
                            { text: 'STATUS', style: 'tableHeader' },
                            { text: 'HANDLED BY', style: 'tableHeader' },
                            { text: 'DATE', style: 'tableHeader', alignment: 'right' }
                        ],
                        ...offboardingSteps
                    ]
                },
                layout: {
                    hLineWidth: (i: number, node: any) => (i === 0 || i === 1) ? 1 : 1,
                    vLineWidth: () => 0,
                    hLineColor: (i: number) => (i === 0 || i === 1) ? '#000000' : '#e5e7eb',
                    fillColor: (i: number) => (i > 0 && i % 2 === 0) ? '#f9fafb' : null,
                    paddingLeft: () => 8,
                    paddingRight: () => 8,
                    paddingTop: () => 6,
                    paddingBottom: () => 6
                }
            },

            { text: '', margin: [0, 0, 0, 20] }, // Spacer
        ];

        // Add Attachments Section if any step has attachments
        const attachmentRows: any[] = [];
        checkoutData.steps
            .filter((step: any) => step.attachment && step.attachment.fileUrl)
            .forEach((step: any) => {
                attachmentRows.push([
                    { text: step.title, style: 'tableCell', bold: true },
                    {
                        text: [
                            {
                                text: 'click here',
                                link: step.attachment.fileUrl,
                                color: '#2563eb',
                                decoration: 'underline'
                            }
                        ],
                        style: 'tableCell'
                    }
                ]);
            });

        if (attachmentRows.length > 0) {
            content.push(
                { text: 'ATTACHED DOCUMENTS', style: 'sectionHeader' },
                {
                    style: 'tableWrapper',
                    table: {
                        headerRows: 1,
                        widths: ['*', 120],
                        body: [
                            [
                                { text: 'STEP', style: 'tableHeader' },
                                { text: 'LINK', style: 'tableHeader' }
                            ],
                            ...attachmentRows
                        ]
                    },
                    layout: {
                        hLineWidth: (i: number, node: any) => (i === 0 || i === 1) ? 1 : 1,
                        vLineWidth: () => 0,
                        hLineColor: (i: number) => (i === 0 || i === 1) ? '#000000' : '#e5e7eb',
                        fillColor: (i: number) => (i > 0 && i % 2 === 0) ? '#f9fafb' : null,
                        paddingLeft: () => 8,
                        paddingRight: () => 8,
                        paddingTop: () => 6,
                        paddingBottom: () => 6
                    }
                },
                { text: '', margin: [0, 0, 0, 20] } // Spacer
            );
        }

        // Only add Assets Section if there are assets
        if (assetRows.length > 0) {
            content.push(
                { text: 'ASSET RETURN & REVOCATION', style: 'sectionHeader' },
                {
                    style: 'tableWrapper',
                    table: {
                        headerRows: 1,
                        widths: ['*', 70, 120],
                        body: [
                            [
                                { text: 'ASSET DETAILS', style: 'tableHeader' },
                                { text: 'STATUS', style: 'tableHeader' },
                                { text: 'NOTES', style: 'tableHeader' }
                            ],
                            ...assetRows
                        ]
                    },
                    layout: {
                        hLineWidth: (i: number, node: any) => (i === 0 || i === 1) ? 1 : 1,
                        vLineWidth: () => 0,
                        hLineColor: (i: number) => (i === 0 || i === 1) ? '#000000' : '#e5e7eb',
                        fillColor: (i: number) => (i > 0 && i % 2 === 0) ? '#f9fafb' : null,
                        paddingLeft: () => 8,
                        paddingRight: () => 8,
                        paddingTop: () => 6,
                        paddingBottom: () => 6
                    }
                },
                { text: '', margin: [0, 0, 0, 30] } // Spacer
            );
        }

        // Declaration & Footer
        content.push(
            {
                stack: [
                    { text: 'FINAL DECLARATION', style: 'sectionHeader', fontSize: 9 },
                    {
                        text: 'By generating this report, the organization certifies that all offboarding procedures for the above-mentioned employee have been executed in accordance with company policy. All access privileges have been revoked, and allocated assets have been verified as returned or otherwise accounted for.',
                        style: 'declaration'
                    }
                ],
                margin: [0, 0, 0, 30]
            }
        );

        const docDefinition: TDocumentDefinitions = {
            pageSize: 'A4',
            pageMargins: [40, 50, 40, 50],
            content: [
                ...content,
                // Signature Block
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: 'System Verified', fontSize: 8, bold: true, color: '#111827' },
                                { text: 'Digital Signature', fontSize: 7, color: '#6b7280' }
                            ]
                        },
                        {
                            width: 200,
                            stack: [
                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: '#9ca3af' }] },
                                { text: 'Authorized Signatory / HR', fontSize: 8, bold: true, margin: [0, 5, 0, 0] },
                                { text: 'Use this space for physical seal if required', fontSize: 7, color: '#9ca3af' }
                            ]
                        }
                    ]
                }
            ],
            styles: {
                sectionHeader: {
                    fontSize: 9,
                    bold: true,
                    color: '#6b7280',
                    margin: [0, 0, 0, 8],
                    characterSpacing: 0.5
                },
                tableWrapper: {
                    margin: [0, 0, 0, 0]
                },
                tableHeader: {
                    fontSize: 7,
                    bold: true,
                    color: '#4b5563',
                    fillColor: '#f3f4f6'
                },
                tableCell: {
                    fontSize: 8,
                    color: '#1f2937'
                },
                fieldLabel: {
                    fontSize: 8,
                    color: '#6b7280',
                    margin: [0, 2, 0, 2]
                },
                fieldValue: {
                    fontSize: 9,
                    color: '#111827',
                    margin: [0, 2, 0, 2]
                },
                declaration: {
                    fontSize: 8,
                    color: '#4b5563',
                    lineHeight: 1.4,
                    alignment: 'justify',
                    margin: [0, 5, 0, 0]
                }
            },
            defaultStyle: {
                font: 'Roboto',
                fontSize: 9,
                color: '#111827'
            }
        };

        try {
            const pdfDoc = printer.createPdfKitDocument(docDefinition);
            const chunks: Buffer[] = [];
            
            pdfDoc.on('data', (chunk) => {
                chunks.push(chunk);
            });
            
            pdfDoc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                resolve(pdfBuffer);
            });

            pdfDoc.on('error', (err) => {
                console.error('PDF Generation Error:', err);
                reject(err);
            });

            pdfDoc.end();
        } catch (error) {
            console.error('PDF Generation Error:', error);
            reject(error);
        }
    });
};