import { NextRequest } from 'next/server';
import { Api } from '@/lib/api-response';
import { SurveySchema } from '@/lib/schemas';
import { SurveyService } from '@/lib/services/survey.service';
import { ensureAuth } from '@/lib/auth-util';

export async function GET() {
  const { authenticated, response } = await ensureAuth();
  if (!authenticated) return response;

  try {
    const surveys = await SurveyService.getAllWithStats();
    return Api.success(surveys);
  } catch (err) {
    return Api.serverError('Failed to fetch surveys', err);
  }
}

export async function POST(request: NextRequest) {
  const { authenticated, response } = await ensureAuth();
  if (!authenticated) return response;

  try {
    const body = await request.json();
...

    if (!result.success) {
      return Api.error('Invalid survey data', 400, 'VALIDATION_ERROR', { issues: result.error.issues });
    }

    const survey = await SurveyService.create(result.data);
    return Api.success(survey, 201);
  } catch (err) {
    return Api.serverError('Failed to create survey', err);
  }
}
