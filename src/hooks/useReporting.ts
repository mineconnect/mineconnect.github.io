import { useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { SecurityEvent } from '../types';
import { toast } from 'sonner';

interface ReportOptions {
    title: string;
    companyName: string;
    includeCharts?: boolean;
    chartIds?: string[]; // IDs of DOM elements to capture
    events?: SecurityEvent[];
}

export const useReporting = () => {

    const generatePDF = useCallback(async ({ title, companyName, includeCharts, chartIds, events }: ReportOptions) => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 20;
            let currentY = 20;

            // --- Header ---
            // Company Name
            doc.setFontSize(22);
            doc.setTextColor(16, 185, 129); // Emerald-500 equivalent approx
            doc.text("MineConnectSAT", margin, currentY);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("Sistema de Auditoría Digital", margin, currentY + 6);

            // Report Title & Meta
            doc.setFontSize(16);
            doc.setTextColor(40);
            doc.text(title, pageWidth - margin, currentY, { align: 'right' });

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Empresa: ${companyName}`, pageWidth - margin, currentY + 6, { align: 'right' });
            doc.text(`Fecha: ${new Date().toLocaleString()}`, pageWidth - margin, currentY + 12, { align: 'right' });

            currentY += 25;

            // --- Separator ---
            doc.setDrawColor(200);
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 10;

            // --- Charts Capture ---
            if (includeCharts && chartIds && chartIds.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(0);
                doc.text("Resumen Visual y KPIs", margin, currentY);
                currentY += 10;

                for (const chartId of chartIds) {
                    const element = document.getElementById(chartId);
                    if (element) {
                        try {
                            const canvas = await html2canvas(element, {
                                scale: 2, // High res
                                backgroundColor: '#0f172a', // Ensure dark background is captured correctly if transparent
                                logging: false,
                                useCORS: true
                            });

                            const imgData = canvas.toDataURL('image/png');
                            const imgProps = doc.getImageProperties(imgData);
                            const pdfWidth = pageWidth - (margin * 2);
                            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                            // Check if image fits on page
                            if (currentY + pdfHeight > pageHeight - margin) {
                                doc.addPage();
                                currentY = margin;
                            }

                            doc.addImage(imgData, 'PNG', margin, currentY, pdfWidth, pdfHeight);
                            currentY += pdfHeight + 10;
                        } catch (err) {
                            console.error(`Error capturing chart ${chartId}:`, err);
                        }
                    }
                }
            }

            // --- Events Table ---
            if (events && events.length > 0) {
                // Check if we need a new page
                if (currentY + 30 > pageHeight - margin) {
                    doc.addPage();
                    currentY = margin;
                } else {
                    currentY += 10;
                }

                doc.setFontSize(14);
                doc.setTextColor(0);
                doc.text("Registro de Eventos de Seguridad", margin, currentY);
                currentY += 5;

                const tableData = events.map(e => [
                    new Date(e.timestamp).toLocaleString(),
                    e.type.replace(/_/g, ' '),
                    e.severity.toUpperCase(),
                    e.vehicleId || 'N/A',
                    e.legalHash ? `${e.legalHash.substring(0, 15)}...` : 'PENDING'
                ]);

                autoTable(doc, {
                    startY: currentY,
                    head: [['Fecha', 'Tipo', 'Severidad', 'Vehículo', 'Legal Hash']],
                    body: tableData,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [16, 185, 129], textColor: 255 }, // Emerald header
                    alternateRowStyles: { fillColor: [245, 245, 245] },
                    margin: { top: margin, bottom: margin, left: margin, right: margin },
                    didDrawPage: (data) => {
                        // Footer
                        const pageCount = doc.getNumberOfPages();
                        doc.setFontSize(8);
                        doc.setTextColor(150);
                        doc.text(
                            `Generado por MineConnectSAT - Página ${pageCount}`,
                            data.settings.margin.left,
                            pageHeight - 10
                        );
                    }
                });
            }

            // Save
            doc.save(`Reporte_${companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success("Reporte PDF generado correctamente");

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Error al generar el PDF");
        }
    }, []);

    const generateCSV = useCallback((events: SecurityEvent[], filename: string = 'audit_log.csv') => {
        try {
            const headers = ['ID', 'Fecha', 'Tipo', 'Severidad', 'Vehículo', 'Usuario', 'Legal Hash', 'Coordenadas'];
            const rows = events.map(e => [
                e.id,
                new Date(e.timestamp).toISOString(),
                e.type,
                e.severity,
                e.vehicleId || '',
                e.userId,
                e.legalHash,
                e.location ? `${e.location.lat},${e.location.lng}` : ''
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Archivo CSV descargado");
        } catch (error) {
            console.error("Error generating CSV:", error);
            toast.error("Error al generar el CSV");
        }
    }, []);

    return {
        generatePDF,
        generateCSV
    };
};
