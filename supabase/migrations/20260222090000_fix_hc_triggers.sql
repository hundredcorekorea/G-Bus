-- ============================================
-- HC 트리거 수정 + 기존 유저 백필
-- ============================================

-- 1. 기존 유저 → hc_profiles 백필
INSERT INTO public.hc_profiles (id, display_name, email)
SELECT
    au.id,
    COALESCE(u.nickname, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
    au.email
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
ON CONFLICT (id) DO NOTHING;

-- 2. 기존 유저 → hc_app_registrations 백필
INSERT INTO public.hc_app_registrations (user_id, app_id, registered_at)
SELECT
    u.id,
    'gbus',
    u.created_at
FROM public.users u
ON CONFLICT (user_id, app_id) DO NOTHING;

-- 3. handle_new_user 트리거 재생성 (OAuth 호환)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.hc_profiles (id, display_name, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            (NEW.raw_user_meta_data->'custom_claims')->>'global_name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.hc_profiles.avatar_url),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. handle_new_user_profile 트리거 재생성 (search_path 문제 수정)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.users (id, nickname, game_nickname, hc_account_id)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            'user'
        ),
        COALESCE(NEW.raw_user_meta_data->>'game_nickname', ''),
        NEW.id::text
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.hc_app_registrations (user_id, app_id)
    VALUES (NEW.id, 'gbus')
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$;
