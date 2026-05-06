import { useState } from "react";
import { Download, FileText, Table, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToCSV, exportToReport, exportToHTML, ReportSection } from "@/lib/exportUtils";
import { toast } from "sonner";

interface ExportButtonProps {
  getReportData: () => ReportSection[];
  getCSVData?: () => Record<string, unknown>[];
  filename: string;
}

export function ExportButton({ getReportData, getCSVData, filename }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'txt' | 'html' | 'csv') => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const fullFilename = `${filename}_${timestamp}`;

      if (format === 'csv' && getCSVData) {
        const data = getCSVData();
        if (data.length === 0) {
          toast.error("No data to export");
          return;
        }
        exportToCSV(data, fullFilename);
        toast.success("CSV exported successfully");
      } else if (format === 'html') {
        const sections = getReportData();
        exportToHTML(sections, fullFilename);
        toast.success("HTML report exported", {
          description: "Open the file and use Ctrl+P to save as PDF",
        });
      } else {
        const sections = getReportData();
        exportToReport(sections, fullFilename);
        toast.success("Report exported successfully");
      }
    } catch (error) {
      toast.error("Export failed", {
        description: String(error),
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={isExporting}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('html')}>
          <FileCode className="h-4 w-4 mr-2" />
          HTML Report (printable as PDF)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('txt')}>
          <FileText className="h-4 w-4 mr-2" />
          Text Report
        </DropdownMenuItem>
        {getCSVData && (
          <DropdownMenuItem onClick={() => handleExport('csv')}>
            <Table className="h-4 w-4 mr-2" />
            CSV Data
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
