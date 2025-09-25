
export type Trial = {
    nctId: string;
    title: string;
    phase?: string;
    locations: string[];
    eligibilityText?: string;
    minAgeYears?: number;
    maxAgeYears?: number;
    status?: string;
  };
  
  const toYears = (age?: string) => {
    if (!age) return undefined;
    const n = parseInt(age, 10);
    if (isNaN(n)) return undefined;
    if (/month/i.test(age)) return Math.round((n / 12) * 10) / 10;
    if (/day/i.test(age)) return Math.round((n / 365) * 10) / 10;
    return n;
  };
  
  type SearchArgs = {
    condition: string;
    state?: string;
    max?: number;
  };
  
  async function fetchV2({ condition, state, max = 25 }: SearchArgs) {
    const params = new URLSearchParams();
    params.set("format", "json");
    params.set("query.term", condition);
    params.set("pageSize", String(Math.min(max, 50)));
  
    const url = `/ctgov2/api/v2/studies?${params.toString()}`;
    console.log(`Fetching v2: ${url}`);
    
    const res = await fetch(url);
    
    if (!res.ok) {
      console.error(`v2 fetch failed: ${res.status} ${res.statusText}`);
      throw new Error(`v2 fetch failed: ${res.status}`);
    }
    
    const data = await res.json();
    console.log(`v2 response: ${data?.studies?.length || 0} studies`);
  
    if (!Array.isArray(data?.studies)) {
      console.warn('v2 response missing studies array:', data);
      return [];
    }
  
    const trials: Trial[] = data.studies.map((s: any) => {
      const id = s?.protocolSection?.identificationModule?.nctId ?? "";
      const title =
        s?.protocolSection?.identificationModule?.officialTitle ||
        s?.protocolSection?.identificationModule?.briefTitle ||
        id ||
        "Untitled study";
  
      const phases = s?.protocolSection?.designModule?.phases;
      const phase = Array.isArray(phases) ? phases.join(", ") : 
                    s?.protocolSection?.designModule?.phase || "";
  
      
      const locs: string[] =
        s?.protocolSection?.contactsLocationsModule?.locations?.map(
          (l: any) => {
            
            const parts = [
              l?.facility,   
              l?.city,        
              l?.state,       
              l?.country      
            ].filter(Boolean);
            return parts.join(", ");
          }
        ) ?? [];
  
      const minAge = toYears(s?.protocolSection?.eligibilityModule?.minimumAge);
      const maxAge = toYears(s?.protocolSection?.eligibilityModule?.maximumAge);
  
      const elig =
        s?.protocolSection?.eligibilityModule?.eligibilityCriteria ??
        s?.protocolSection?.eligibilityModule?.criteria;

      const status = s?.protocolSection?.statusModule?.overallStatus?.toLowerCase();
  
      return {
        nctId: id,
        title,
        phase,
        locations: locs,
        eligibilityText: elig,
        minAgeYears: minAge,
        maxAgeYears: maxAge,
        status,
      };
    });
  
    console.log(`Mapped ${trials.length} trials with locations:`, 
      trials.slice(0, 2).map(t => ({ nctId: t.nctId, locations: t.locations }))
    );
  

    let filtered = trials;
    if (state) {
      const stateUpper = state.toUpperCase();
      filtered = trials.filter(t => 
        t.locations?.some(l => {
          const locationUpper = l.toUpperCase();
          return (
            locationUpper.includes(`, ${stateUpper}`) ||
            locationUpper.includes(`${stateUpper} `) ||
            locationUpper.endsWith(stateUpper) ||
            (stateUpper === 'CA' && (locationUpper.includes('CALIFORNIA') || locationUpper.includes(', CA'))) ||
            (stateUpper === 'NY' && (locationUpper.includes('NEW YORK') || locationUpper.includes(', NY'))) ||
            (stateUpper === 'FL' && (locationUpper.includes('FLORIDA') || locationUpper.includes(', FL'))) ||
            (stateUpper === 'TX' && (locationUpper.includes('TEXAS') || locationUpper.includes(', TX')))
            
          );
        })
      );
      
      console.log(`State filtering for "${state}": ${trials.length} → ${filtered.length} trials`);
      if (filtered.length === 0 && trials.length > 0) {
        console.warn(`No trials found for state "${state}". Sample locations:`, 
          trials.slice(0, 3).flatMap(t => t.locations).slice(0, 5)
        );
      }
    }
  
    return filtered.slice(0, max);
  }
  
  export async function fetchTrialsReal(args: SearchArgs): Promise<Trial[]> {
    console.log(`fetchTrialsReal called with:`, args);
    
    try {
      console.log(`Attempting v2 fetch...`);
      const v2 = await fetchV2(args);
      console.log(`✅ v2 result: ${v2.length} trials found`);
      return v2;
    } catch (err) {
      console.error("❌ v2 API failed:", err);
      return [];
    }
  }