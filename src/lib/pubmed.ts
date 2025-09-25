// PubMed API 

export interface PubMedArticle {
    pmid: string;
    title: string;
    authors: string[];
    journal: string;
    publishDate: string;
    abstract: string;
    doi?: string;
    nctIds: string[]; 
    studyType?: string; 
    url: string;
  }
  
  export interface PubMedSearchResult {
    articles: PubMedArticle[];
    totalCount: number;
    query: string;
  }
  
  const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  const ESEARCH_URL = `${PUBMED_BASE_URL}/esearch.fcgi`;
  const EFETCH_URL = `${PUBMED_BASE_URL}/efetch.fcgi`;
  
  export async function searchPubMedByCondition(
    condition: string,
    maxResults: number = 20
  ): Promise<PubMedSearchResult> {
    try {
      console.log(`Searching PubMed for: "${condition}"`);
      
      const searchQuery = buildConditionSearchQuery(condition);
      const searchParams = new URLSearchParams({
        db: 'pubmed',
        term: searchQuery,
        retmax: maxResults.toString(),
        retmode: 'json',
        sort: 'relevance',
        field: 'title/abstract'
      });
  
      const searchResponse = await fetch(`${ESEARCH_URL}?${searchParams}`);
      const searchData = await searchResponse.json();
      
      const pmids = searchData.esearchresult?.idlist || [];
      console.log(`Found ${pmids.length} PubMed articles for ${condition}`);
      
      if (pmids.length === 0) {
        return { articles: [], totalCount: 0, query: searchQuery };
      }
  
      const articles = await fetchPubMedArticles(pmids);
      
      return {
        articles,
        totalCount: parseInt(searchData.esearchresult?.count || '0'),
        query: searchQuery
      };
    } catch (error) {
      console.error('Error searching PubMed:', error);
      return { articles: [], totalCount: 0, query: condition };
    }
  }
  
  export async function searchPubMedByNCTId(nctId: string): Promise<PubMedArticle[]> {
    try {
      console.log(`Searching PubMed for NCT ID: ${nctId}`);
      
      const searchQuery = `"${nctId}"[All Fields]`;
      const searchParams = new URLSearchParams({
        db: 'pubmed',
        term: searchQuery,
        retmax: '10',
        retmode: 'json',
        sort: 'pub date'
      });
  
      const searchResponse = await fetch(`${ESEARCH_URL}?${searchParams}`);
      const searchData = await searchResponse.json();
      
      const pmids = searchData.esearchresult?.idlist || [];
      console.log(`Found ${pmids.length} publications for ${nctId}`);
      
      if (pmids.length === 0) return [];
  
      return await fetchPubMedArticles(pmids);
    } catch (error) {
      console.error(`Error searching PubMed for NCT ID ${nctId}:`, error);
      return [];
    }
  }
  
  function buildConditionSearchQuery(condition: string): string {
    const cleanCondition = condition.replace(/[^\w\s-]/g, '').trim();
    
    return `${cleanCondition}[Title/Abstract]`;
  }
  
  async function fetchPubMedArticles(pmids: string[]): Promise<PubMedArticle[]> {
    try {
      const fetchParams = new URLSearchParams({
        db: 'pubmed',
        id: pmids.join(','),
        retmode: 'xml',
        rettype: 'abstract'
      });
  
      const fetchResponse = await fetch(`${EFETCH_URL}?${fetchParams}`);
      const xmlText = await fetchResponse.text();
      
      return parsePubMedXML(xmlText);
    } catch (error) {
      console.error('Error fetching PubMed articles:', error);
      return [];
    }
  }
  
  function parsePubMedXML(xmlText: string): PubMedArticle[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const articles: PubMedArticle[] = [];
    
    const pubmedArticles = xmlDoc.getElementsByTagName('PubmedArticle');
    
    for (let i = 0; i < pubmedArticles.length; i++) {
      const article = pubmedArticles[i];
      
      try {
        const pmid = getTextContent(article, 'PMID') || '';
        const title = getTextContent(article, 'ArticleTitle') || '';
        const abstract = getTextContent(article, 'AbstractText') || '';
        const journal = getTextContent(article, 'Title') || ''; // Journal title
        
        // Extract authors
        const authorNodes = article.getElementsByTagName('Author');
        const authors: string[] = [];
        for (let j = 0; j < authorNodes.length; j++) {
          const lastName = getTextContent(authorNodes[j], 'LastName') || '';
          const foreName = getTextContent(authorNodes[j], 'ForeName') || '';
          if (lastName) {
            authors.push(`${foreName} ${lastName}`.trim());
          }
        }
        
        // Extract publication date
        const pubDate = extractPublicationDate(article);
        
        // Extract DOI
        const doi = extractDOI(article);
        
        // Extract NCT IDs from title and abstract
        const nctIds = extractNCTIds(`${title} ${abstract}`);
        
        // Determine study type
        const studyType = determineStudyType(title, abstract);
        
        articles.push({
          pmid,
          title,
          authors: authors.slice(0, 10), // Limit to first 10 authors
          journal,
          publishDate: pubDate,
          abstract,
          doi,
          nctIds,
          studyType,
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
        });
      } catch (error) {
        console.error('Error parsing PubMed article:', error);
      }
    }
    
    return articles;
  }
  
  function getTextContent(parent: Element, tagName: string): string | null {
    const element = parent.getElementsByTagName(tagName)[0];
    return element ? element.textContent?.trim() || null : null;
  }
  
  function extractPublicationDate(article: Element): string {
    try {
      const pubDate = article.getElementsByTagName('PubDate')[0];
      if (!pubDate) return '';
      
      const year = getTextContent(pubDate, 'Year') || '';
      const month = getTextContent(pubDate, 'Month') || '';
      const day = getTextContent(pubDate, 'Day') || '';
      
      if (year && month && day) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (year && month) {
        return `${year}-${month.padStart(2, '0')}`;
      } else if (year) {
        return year;
      }
      
      return '';
    } catch (error) {
      return '';
    }
  }
  
  function extractDOI(article: Element): string | undefined {
    const articleIds = article.getElementsByTagName('ArticleId');
    for (let i = 0; i < articleIds.length; i++) {
      const idType = articleIds[i].getAttribute('IdType');
      if (idType === 'doi') {
        return articleIds[i].textContent || undefined;
      }
    }
    return undefined;
  }
  
  function extractNCTIds(text: string): string[] {
    const nctRegex = /NCT\d{8}/g;
    const matches = text.match(nctRegex) || [];
    return [...new Set(matches)]; 
  }
  
  function determineStudyType(title: string, abstract: string): string {
    const text = `${title} ${abstract}`.toLowerCase();
    
    if (text.includes('randomized controlled trial') || text.includes('rct')) {
      return 'Randomized Controlled Trial';
    } else if (text.includes('clinical trial')) {
      return 'Clinical Trial';
    } else if (text.includes('observational') || text.includes('cohort')) {
      return 'Observational Study';
    } else if (text.includes('systematic review') || text.includes('meta-analysis')) {
      return 'Systematic Review/Meta-analysis';
    } else if (text.includes('case report') || text.includes('case series')) {
      return 'Case Report/Series';
    }
    
    return 'Research Article';
  }
  
  export async function getPublicationsForTrials(nctIds: string[]): Promise<Record<string, PubMedArticle[]>> {
    const results: Record<string, PubMedArticle[]> = {};
    
    const batchSize = 5;
    for (let i = 0; i < nctIds.length; i += batchSize) {
      const batch = nctIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (nctId) => {
        const articles = await searchPubMedByNCTId(nctId);
        return { nctId, articles };
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ nctId, articles }) => {
        results[nctId] = articles;
      });
      
      if (i + batchSize < nctIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return results;
  }