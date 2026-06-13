"""
PDF report generation endpoint.
Uses ReportLab to generate a report from analysis results.
"""

import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from app.api.dependencies import get_db
from app.repositories import session_repository
from app.db.models import Analysis, Insight, Visualization, Forecast, Dataset, Report
from app.core.exceptions import DataSageException, DatabaseException, SessionNotFoundException
from app.core.auth import CurrentUser

router = APIRouter()


@router.get("/session/{session_id}/report")
async def generate_report(session_id: str, user_id: str = CurrentUser, db: AsyncSession = Depends(get_db)):
    try:
        session = await session_repository.verify_ownership(db, session_id, user_id)
        

        # Fetch all data
        analyses_result = await db.execute(
            select(Analysis).where(Analysis.session_id == session_id)
        )
        analyses = {a.analysis_type: a.results for a in analyses_result.scalars().all()}

        dataset_result = await db.execute(
            select(Dataset).where(Dataset.session_id == session_id)
        )
        dataset = dataset_result.scalars().first()

        insights_result = await db.execute(
            select(Insight)
            .where(Insight.session_id == session_id)
            .order_by(Insight.rank.asc().nullsfirst())
        )
        insights = insights_result.scalars().all()

        # Build PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Title"],
            fontSize=24,
            spaceAfter=20,
            textColor=colors.HexColor("#1a1a2e"),
        )
        heading_style = ParagraphStyle(
            "CustomHeading",
            parent=styles["Heading2"],
            fontSize=16,
            spaceBefore=16,
            spaceAfter=8,
            textColor=colors.HexColor("#16213e"),
        )
        body_style = styles["Normal"]

        elements = []

        # Title
        filename = dataset.filename if dataset else "Unknown Dataset"
        elements.append(Paragraph(f"DataSage Analysis Report", title_style))
        elements.append(Paragraph(f"Dataset: {filename}", heading_style))
        elements.append(Spacer(1, 12))

        # Dataset Summary
        if dataset:
            elements.append(Paragraph("Dataset Overview", heading_style))
            summary_data = [
                ["Property", "Value"],
                ["Filename", dataset.filename],
                ["Rows", str(dataset.row_count)],
                ["Columns", str(dataset.col_count)],
                ["File Size", f"{dataset.file_size_bytes / 1024:.1f} KB"],
            ]
            table = Table(summary_data, colWidths=[2.5 * inch, 4 * inch])
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 10),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f0f0")]),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ]
                )
            )
            elements.append(table)
            elements.append(Spacer(1, 16))

        # Cleaning Report
        cleaning = analyses.get("cleaning_report", {})
        if cleaning:
            elements.append(Paragraph("Data Cleaning Summary", heading_style))
            strategies = cleaning.get("strategies_summary", [])
            for s in strategies:
                elements.append(Paragraph(f"• {s}", body_style))
            elements.append(Spacer(1, 8))
            elements.append(
                Paragraph(
                    f"Original: {cleaning.get('original_rows', '?')} rows × {cleaning.get('original_cols', '?')} cols → "
                    f"Final: {cleaning.get('final_rows', '?')} rows × {cleaning.get('final_cols', '?')} cols",
                    body_style,
                )
            )
            elements.append(Spacer(1, 12))

        # Top Correlations
        eda = analyses.get("eda_summary", {})
        top_corr = eda.get("top_correlations", [])
        if top_corr:
            elements.append(Paragraph("Top Correlations", heading_style))
            corr_data = [["Column 1", "Column 2", "Correlation"]]
            for c in top_corr[:5]:
                corr_data.append([c["col1"], c["col2"], f"{c['correlation']:.3f}"])
            table = Table(corr_data, colWidths=[2 * inch, 2 * inch, 2 * inch])
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#16213e")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 10),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f0f0")]),
                    ]
                )
            )
            elements.append(table)
            elements.append(Spacer(1, 12))

        # Insights
        if insights:
            elements.append(Paragraph("Key Insights", heading_style))
            for i, insight in enumerate(insights, 1):
                cat_label = f"[{insight.category or 'general'}] " if insight.category else ""
                elements.append(
                    Paragraph(f"<b>{i}. {cat_label}</b>{insight.content}", body_style)
                )
                elements.append(Spacer(1, 6))
            elements.append(Spacer(1, 12))

        # Footer
        elements.append(Spacer(1, 24))
        elements.append(
            Paragraph(
                "Generated by DataSage — AI-Powered Data Analysis Platform",
                ParagraphStyle("Footer", parent=body_style, fontSize=8, textColor=colors.grey),
            )
        )

        doc.build(elements)
        buffer.seek(0)

        # Save report record
        report = Report(
            session_id=session_id,
            content=f"PDF report for {filename}",
        )
        db.add(report)
        await db.commit()

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=datasage_report_{session_id[:8]}.pdf"
            },
        )
    except DataSageException:
        raise
    except Exception as e:
        raise DatabaseException(f"Report generation failed: {str(e)}")
