-- ============================================
-- handle_new_user 트리거 문법 오류 핫픽스
-- 이전 SQL에서 ->>'custom_claims' ->> 'global_name' 연산자 오류 수정
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
