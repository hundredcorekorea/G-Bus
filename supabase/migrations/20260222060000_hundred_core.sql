-- ============================================
-- Hundred Core: 통합 인증 시스템
-- ============================================

-- updated_at 트리거 함수 (이미 존재하면 스킵)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. hc_profiles: 통합 프로필
-- ============================================
CREATE TABLE IF NOT EXISTS public.hc_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    email TEXT,
    avatar_url TEXT,
    locale TEXT DEFAULT 'ko',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hc_profiles_email ON public.hc_profiles(email);

ALTER TABLE public.hc_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hc_profile"
    ON public.hc_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own hc_profile"
    ON public.hc_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own hc_profile"
    ON public.hc_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_hc_profiles_updated_at
    BEFORE UPDATE ON public.hc_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. hc_app_registrations: 앱별 등록 기록
-- ============================================
CREATE TABLE IF NOT EXISTS public.hc_app_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    app_id TEXT NOT NULL,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    app_metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, app_id)
);

CREATE INDEX IF NOT EXISTS idx_hc_app_reg_user ON public.hc_app_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_hc_app_reg_app ON public.hc_app_registrations(app_id);

ALTER TABLE public.hc_app_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own app registrations"
    ON public.hc_app_registrations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own app registrations"
    ON public.hc_app_registrations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own app registrations"
    ON public.hc_app_registrations FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- 3. 트리거: auth.users INSERT 시 hc_profiles 자동 생성
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.hc_profiles (id, display_name, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'full_name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 4. 기존 유저 백필 마이그레이션
-- ============================================

-- 기존 auth.users → hc_profiles 생성
INSERT INTO public.hc_profiles (id, display_name, email)
SELECT
    au.id,
    COALESCE(gu.nickname, split_part(au.email, '@', 1)),
    au.email
FROM auth.users au
LEFT JOIN public.users gu ON gu.id = au.id
ON CONFLICT (id) DO NOTHING;

-- 기존 G-Bus users → hc_app_registrations 등록
INSERT INTO public.hc_app_registrations (user_id, app_id, registered_at)
SELECT
    id,
    'gbus',
    created_at
FROM public.users
ON CONFLICT (user_id, app_id) DO NOTHING;

-- hc_account_id 백필
UPDATE public.users
SET hc_account_id = id::TEXT
WHERE hc_account_id IS NULL;

-- ============================================
-- 5. RPC: 이메일 존재 확인 (Flutter 앱용)
-- ============================================
CREATE OR REPLACE FUNCTION public.check_email_exists(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM auth.users WHERE email = lower(check_email));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
