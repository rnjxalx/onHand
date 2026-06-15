import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL, EMOTIONS, Emotion } from './config';

/**
 * 고양이 사진 → ComfyUI 캐릭터(basic/happy/sad) 생성 클라이언트.
 *
 * 흐름:
 *   1) POST /api/v1/generate  (사진 multipart 업로드) → job_id 발급
 *   2) GET  /api/v1/jobs/{id} 폴링 → status 가 completed 될 때까지 대기
 *   3) GET  /api/v1/jobs/{id}/images/{emotion} → PNG 를 로컬에 저장
 *
 * 서버의 작업 저장소는 인메모리(api/jobs.py)라 서버 재시작 시 사라지므로,
 * 생성된 이미지는 반드시 기기 로컬(document 디렉터리)에 내려받아 보관한다.
 */

// 워크플로 3종(SDXL + ControlNet, 각 ~600초 타임아웃)을 고려한 넉넉한 전체 대기 한도.
const OVERALL_TIMEOUT_MS = 30 * 60 * 1000; // 30분
const POLL_INTERVAL_MS = 3000;

export class GenerationError extends Error {}

export interface GenerationProgress {
  state: 'uploading' | 'processing' | 'downloading';
  /** 완료된 이미지 수 (0..total) */
  progress: number;
  total: number;
  /** 서버가 보고한 현재 단계(emotion 키 등) */
  step: string;
}

export interface GeneratedImageUris {
  basic: string;
  happy: string;
  sad: string;
}

export interface GenerateResult {
  jobId: string;
  images: GeneratedImageUris;
}

type ProgressCb = (p: GenerationProgress) => void;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function trim(text: string, max = 200): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** ComfyUI 백엔드가 떠 있는지 빠르게 확인. (네트워크/주소 오류를 미리 알려주기 위함) */
export async function checkServerReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

async function uploadPhoto(photoUri: string): Promise<{ jobId: string; emotions: string[] }> {
  const name = photoUri.split('/').pop() || 'cat.jpg';
  const form = new FormData();
  // React Native 의 FormData 파일 형식 ({ uri, name, type }). Content-Type 은 fetch 가 자동 설정.
  form.append('file', { uri: photoUri, name, type: guessMime(name) } as any);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/generate`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: form,
    });
  } catch (e) {
    throw new GenerationError(
      `서버에 연결할 수 없어요. 주소(${API_BASE_URL})와 같은 Wi-Fi 연결을 확인해주세요.`,
    );
  }

  if (res.status === 503) {
    throw new GenerationError('ComfyUI 서버가 실행 중이 아니에요. 먼저 ComfyUI 를 켜주세요.');
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new GenerationError(`업로드 실패 (${res.status}) ${trim(detail)}`);
  }

  const data = await res.json();
  if (!data?.job_id) {
    throw new GenerationError('서버 응답에 job_id 가 없습니다.');
  }
  const emotions: string[] = Array.isArray(data.emotions) ? data.emotions : [...EMOTIONS];
  return { jobId: data.job_id, emotions };
}

async function waitForCompletion(jobId: string, onProgress?: ProgressCb): Promise<void> {
  const deadline = Date.now() + OVERALL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    let job: any = null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`);
      if (res.ok) job = await res.json();
    } catch {
      // 일시적 네트워크 오류 → 다음 폴링에서 재시도
    }

    if (job) {
      onProgress?.({
        state: 'processing',
        progress: typeof job.progress === 'number' ? job.progress : 0,
        total: typeof job.total === 'number' ? job.total : EMOTIONS.length,
        step: job.current_step ?? '',
      });

      if (job.status === 'completed') return;
      if (job.status === 'failed') {
        throw new GenerationError(job.error || '이미지 생성에 실패했어요.');
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new GenerationError('생성 시간이 너무 오래 걸려 중단했어요. 잠시 후 다시 시도해주세요.');
}

async function downloadImages(jobId: string, emotions: string[]): Promise<GeneratedImageUris> {
  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) {
    throw new GenerationError('이 기기에서는 이미지를 저장할 수 없어요.');
  }

  const dir = `${baseDir}cat-characters/${jobId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const result: Partial<GeneratedImageUris> = {};
  for (const emotion of emotions) {
    const url = `${API_BASE_URL}/api/v1/jobs/${jobId}/images/${emotion}`;
    const dest = `${dir}${emotion}.png`;
    const download = await FileSystem.downloadAsync(url, dest);
    if (download.status !== 200) {
      throw new GenerationError(`${emotion} 이미지를 내려받지 못했어요 (${download.status}).`);
    }
    result[emotion as Emotion] = download.uri;
  }

  // 세 종류(basic/happy/sad)가 모두 채워졌는지 확인.
  for (const emotion of EMOTIONS) {
    if (!result[emotion]) {
      throw new GenerationError(`서버가 ${emotion} 이미지를 보내주지 않았어요.`);
    }
  }
  return result as GeneratedImageUris;
}

/** 사용자에게 보여줄 한국어 진행 문구. */
export function describeProgress(p: GenerationProgress): string {
  if (p.state === 'uploading') return '사진 업로드 중...';
  if (p.state === 'downloading') return '캐릭터 저장 중...';

  const labels: Record<string, string> = {
    basic: '기본',
    happy: '행복한',
    sad: '슬픈',
    done: '마무리',
  };
  if (p.progress >= p.total || p.step === 'done') return '마무리하는 중...';
  const kr = labels[p.step] ?? p.step;
  const current = Math.min(p.progress + 1, p.total);
  return `${kr} 표정 그리는 중... (${current}/${p.total})`;
}

/**
 * 사진 한 장으로 basic/happy/sad 캐릭터를 생성하고 로컬에 저장한다.
 * 호출 측은 onProgress 로 진행 상태를 UI 에 반영할 수 있다.
 */
export async function generateCatImages(
  photoUri: string,
  onProgress?: ProgressCb,
): Promise<GenerateResult> {
  onProgress?.({ state: 'uploading', progress: 0, total: EMOTIONS.length, step: '' });
  const { jobId, emotions } = await uploadPhoto(photoUri);

  await waitForCompletion(jobId, onProgress);

  onProgress?.({ state: 'downloading', progress: emotions.length, total: emotions.length, step: 'done' });
  const images = await downloadImages(jobId, emotions);

  return { jobId, images };
}
