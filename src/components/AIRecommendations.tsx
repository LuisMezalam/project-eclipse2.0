import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, AlertTriangle, CheckCircle, Info, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Recommendation {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
}

interface AIRecommendationsResponse {
  recommendations: Recommendation[];
  summary: string;
  reliabilityAssessment: 'critical' | 'marginal' | 'acceptable' | 'excellent';
}

interface AIRecommendationsProps {
  analysisType: 'static-beam' | 'dynamic' | 'form';
  parameters: Record<string, number | string>;
  className?: string;
}

const impactColors = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const impactIcons = {
  high: <ArrowUp className="h-3 w-3" />,
  medium: <Minus className="h-3 w-3" />,
  low: <ArrowDown className="h-3 w-3" />,
};

const assessmentConfig = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertTriangle },
  marginal: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Info },
  acceptable: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: CheckCircle },
  excellent: { color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
};

export function AIRecommendations({ analysisType, parameters, className = '' }: AIRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AIRecommendationsResponse | null>(null);

  const getRecommendations = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.info('AI recommendations require Supabase function configuration.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('design-recommendations', {
        body: { analysisType, parameters }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setRecommendations(data);
      toast.success('AI recommendations generated successfully');
    } catch (error: unknown) {
      console.error('Error getting recommendations:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get AI recommendations');
    } finally {
      setLoading(false);
    }
  };

  const AssessmentIcon = recommendations ? assessmentConfig[recommendations.reliabilityAssessment]?.icon || Info : Info;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">AI Design Recommendations</h3>
        </div>
        <Button 
          onClick={getRecommendations} 
          disabled={loading}
          className="bg-primary hover:bg-primary/90"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Get AI Recommendations
            </>
          )}
        </Button>
      </div>

      {recommendations && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary Card */}
          <Card className={`border ${assessmentConfig[recommendations.reliabilityAssessment]?.bg || 'bg-muted/50'}`}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AssessmentIcon className={`h-5 w-5 mt-0.5 ${assessmentConfig[recommendations.reliabilityAssessment]?.color || 'text-muted-foreground'}`} />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">Reliability Assessment:</span>
                    <Badge variant="outline" className={assessmentConfig[recommendations.reliabilityAssessment]?.color}>
                      {recommendations.reliabilityAssessment.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{recommendations.summary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations List */}
          <div className="grid gap-3">
            {recommendations.recommendations.map((rec, index) => (
              <Card key={index} className="border border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-medium text-foreground">{rec.title}</CardTitle>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs capitalize">
                        {rec.category}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${impactColors[rec.impact]}`}>
                        {impactIcons[rec.impact]}
                        <span className="ml-1">{rec.impact} impact</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!recommendations && !loading && (
        <Card className="border border-dashed border-border/50 bg-muted/20">
          <CardContent className="py-8 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Click "Get AI Recommendations" to receive personalized suggestions for improving your design's reliability.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
