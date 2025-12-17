import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const COMPLIANCE_DOCS = [
  { 
    name: 'MCI Safety Manual', 
    category: 'Safety Manual',
    description: 'Complete safety procedures and protocols',
    color: 'bg-red-500'
  },
  { 
    name: 'Employee Handbook', 
    category: 'HR Policies',
    description: 'Company policies and employee guidelines',
    color: 'bg-blue-500'
  },
  { 
    name: 'Disciplinary Action Form', 
    category: 'HR Forms',
    description: 'Form for documenting disciplinary actions',
    color: 'bg-orange-500'
  },
  { 
    name: 'Written Warning Template', 
    category: 'HR Forms',
    description: 'Standard written warning document',
    color: 'bg-orange-500'
  },
  { 
    name: 'Incident Report Form', 
    category: 'Safety Forms',
    description: 'Report workplace incidents and near-misses',
    color: 'bg-red-500'
  },
  { 
    name: 'PPE Inspection Checklist', 
    category: 'Safety Forms',
    description: 'Daily PPE condition inspection',
    color: 'bg-green-500'
  }
];

export default function DocumentControlTab({ isAdmin }) {
  const { data: uploadedDocs = [] } = useQuery({
    queryKey: ['compliance-documents'],
    queryFn: () => base44.entities.Document.filter({ 
      category: { $in: ['Safety Manual', 'HR Policies', 'HR Forms', 'Safety Forms'] }
    })
  });

  const getDocUrl = (docName) => {
    const doc = uploadedDocs.find(d => d.file_name?.includes(docName));
    return doc?.file_url;
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Document Control Center</h2>
        <p className="text-slate-600 dark:text-slate-400">MCI manuals, policies, and disciplinary forms</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COMPLIANCE_DOCS.map((doc, index) => {
          const docUrl = getDocUrl(doc.name);
          
          return (
            <Card key={index} className="bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${doc.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">{doc.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{doc.category}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{doc.description}</p>
                    
                    {docUrl ? (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(docUrl, '_blank')}
                          className="flex-1"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = docUrl;
                            link.download = doc.name;
                            link.click();
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" disabled className="w-full">
                        Not Uploaded Yet
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Document Management</h4>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {isAdmin 
                  ? 'Upload company documents through the Documents page and they will automatically appear here.'
                  : 'Contact your administrator if you need access to additional compliance documents.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}