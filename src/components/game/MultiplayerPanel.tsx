import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users, UserPlus, Check, X, Shield, Link2 } from 'lucide-react';

interface CityLink {
  id: string;
  city_a: string;
  city_b: string;
  status: string;
}

interface Profile {
  user_id: string;
  display_name: string;
}

interface Props {
  cityId: string | null;
  onClose: () => void;
}

export default function MultiplayerPanel({ cityId, onClose }: Props) {
  const { user } = useAuth();
  const [links, setLinks] = useState<CityLink[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [inviteEmail, setInviteEmail] = useState('');
  const [status, setStatus] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (!cityId) return;
    loadLinks();
    loadPermissions();

    const channel = supabase
      .channel('city-links')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'city_links' }, () => loadLinks())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cityId]);

  const loadLinks = async () => {
    if (!cityId) return;
    const { data } = await supabase.from('city_links').select('*');
    if (data) {
      setLinks(data);
      // Load profiles for linked cities
      const cityIds = data.flatMap(l => [l.city_a, l.city_b]).filter(id => id !== cityId);
      if (cityIds.length > 0) {
        const { data: cities } = await supabase.from('cities').select('id, user_id').in('id', cityIds);
        if (cities) {
          const userIds = cities.map(c => c.user_id);
          const { data: profs } = await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds);
          if (profs) {
            const map: Record<string, string> = {};
            for (const p of profs) {
              const city = cities.find(c => c.user_id === p.user_id);
              if (city) map[city.id] = p.display_name;
            }
            setProfiles(map);
          }
        }
      }
    }
  };

  const loadPermissions = async () => {
    if (!cityId) return;
    const { data } = await supabase.from('build_permissions').select('granted_to').eq('city_id', cityId);
    if (data) setPermissions(data.map(p => p.granted_to));
  };

  const sendInvite = async () => {
    if (!cityId || !inviteEmail.trim()) return;
    setStatus('');

    // Find user by email through profiles
    const { data: allProfiles } = await supabase.from('profiles').select('user_id, display_name');
    // Find their city
    const { data: allCities } = await supabase.from('cities').select('id, user_id');

    if (!allProfiles || !allCities) {
      setStatus('Could not search for players');
      return;
    }

    // We need to find the user - search by checking auth (we can't query auth.users directly)
    // Instead, look for a city that isn't ours
    const otherCities = allCities.filter(c => c.user_id !== user?.id);
    if (otherCities.length === 0) {
      setStatus('No other players found');
      return;
    }

    // For simplicity, find by display name
    const targetProfile = allProfiles.find(p =>
      p.display_name.toLowerCase() === inviteEmail.trim().toLowerCase()
    );

    if (!targetProfile) {
      setStatus('Player not found. Enter their display name.');
      return;
    }

    const targetCity = allCities.find(c => c.user_id === targetProfile.user_id);
    if (!targetCity) {
      setStatus('Player has no city yet');
      return;
    }

    const { error } = await supabase.from('city_links').insert({
      city_a: cityId,
      city_b: targetCity.id,
    });

    if (error) {
      setStatus(error.message.includes('duplicate') ? 'Already linked!' : error.message);
    } else {
      setStatus('Invite sent!');
      setInviteEmail('');
      loadLinks();
    }
  };

  const acceptLink = async (linkId: string) => {
    await supabase.from('city_links').update({ status: 'accepted' }).eq('id', linkId);
    loadLinks();
  };

  const rejectLink = async (linkId: string) => {
    await supabase.from('city_links').delete().eq('id', linkId);
    loadLinks();
  };

  const togglePermission = async (linkedCityId: string) => {
    if (!cityId) return;
    // Find the user_id of the linked city
    const { data: city } = await supabase.from('cities').select('user_id').eq('id', linkedCityId).maybeSingle();
    if (!city) return;

    if (permissions.includes(city.user_id)) {
      await supabase.from('build_permissions').delete().eq('city_id', cityId).eq('granted_to', city.user_id);
      setPermissions(prev => prev.filter(p => p !== city.user_id));
    } else {
      await supabase.from('build_permissions').insert({ city_id: cityId, granted_to: city.user_id });
      setPermissions(prev => [...prev, city.user_id]);
    }
  };

  const pendingIncoming = links.filter(l => l.city_b === cityId && l.status === 'pending');
  const activeLinks = links.filter(l => l.status === 'accepted');

  return (
    <div className="glass-panel rounded-xl p-4 w-72 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-xs tracking-wider text-primary flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> MULTIPLAYER
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Invite */}
      <div className="mb-3">
        <label className="text-[10px] text-muted-foreground font-display tracking-wider">LINK CITY (by player name)</label>
        <div className="flex gap-1 mt-1">
          <input
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="flex-1 px-2 py-1.5 bg-secondary/50 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Player name..."
          />
          <button onClick={sendInvite} className="px-2 py-1.5 bg-primary/20 text-primary rounded-lg text-xs hover:bg-primary/30">
            <UserPlus className="w-3.5 h-3.5" />
          </button>
        </div>
        {status && <p className="text-[10px] text-muted-foreground mt-1">{status}</p>}
      </div>

      {/* Pending invites */}
      {pendingIncoming.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-display tracking-wider text-amber-400 mb-1">PENDING INVITES</p>
          {pendingIncoming.map(link => (
            <div key={link.id} className="flex items-center justify-between bg-secondary/30 rounded-lg px-2 py-1.5 mb-1">
              <span className="text-xs text-foreground">{profiles[link.city_a] || 'Unknown'}</span>
              <div className="flex gap-1">
                <button onClick={() => acceptLink(link.id)} className="text-emerald-400 hover:text-emerald-300">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => rejectLink(link.id)} className="text-destructive hover:text-red-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active links */}
      {activeLinks.length > 0 && (
        <div>
          <p className="text-[10px] font-display tracking-wider text-emerald-400 mb-1">LINKED CITIES</p>
          {activeLinks.map(link => {
            const otherCityId = link.city_a === cityId ? link.city_b : link.city_a;
            return (
              <div key={link.id} className="flex items-center justify-between bg-secondary/30 rounded-lg px-2 py-1.5 mb-1">
                <div className="flex items-center gap-1.5">
                  <Link2 className="w-3 h-3 text-primary" />
                  <span className="text-xs text-foreground">{profiles[otherCityId] || 'City'}</span>
                </div>
                <button
                  onClick={() => togglePermission(otherCityId)}
                  className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  title="Toggle build permission"
                >
                  <Shield className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeLinks.length === 0 && pendingIncoming.length === 0 && (
        <p className="text-[10px] text-muted-foreground text-center">No linked cities yet. Invite a friend!</p>
      )}
    </div>
  );
}
