import { Client } from '@opensearch-project/opensearch';
import { Bhajan } from '../models/Bhajan';

const searchClient = new Client({
  node: 'http://localhost:9200',
});

const INDEX_NAME = 'bhajans';

export class SearchService {
  static async initIndex() {
    const indexExists = await searchClient.indices.exists({ index: INDEX_NAME });
    
    if (!indexExists.body) {
      await searchClient.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            properties: {
              author: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              title: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              chords: { 
                type: 'text',
                analyzer: 'standard'
              },
              text: { 
                type: 'text',
                analyzer: 'standard'
              },
              translation: { 
                type: 'text',
                analyzer: 'standard'
              },
              options: { 
                type: 'text',
                analyzer: 'standard'
              },
              review: { 
                type: 'text',
                analyzer: 'standard'
              },
              lessons: { 
                type: 'text',
                analyzer: 'standard'
              }
            }
          }
        }
      });
    }
  }

  static async indexItem(bhajan: Bhajan) {
    await searchClient.index({
      index: INDEX_NAME,
      id: `${bhajan.author}-${bhajan.title}`,
      body: bhajan,
      refresh: true
    });
  }

  static async search(query: string) {
    const mappingResponse = await searchClient.indices.getMapping({
      index: INDEX_NAME
    });
    
    const properties = mappingResponse.body[INDEX_NAME].mappings.properties;
    const highlightFields = Object.keys(properties).reduce((acc, field) => {
      acc[field] = { number_of_fragments: 1 };
      return acc;
    }, {} as Record<string, { number_of_fragments: 1 }>);

    const result = await searchClient.search({
      index: INDEX_NAME,
      body: {
        query: {
          multi_match: {
            query,
            fields: [
              'title^3',
              'author^2',
              'text^2',
              'translation',
              'chords',
              'options',
              'review',
              'lessons'
            ],
            fuzziness: 'AUTO',
            operator: 'or'
          }
        },
        highlight: {
          fields: highlightFields
        }
      }
    });

    return result.body.hits.hits.map((hit: {
      _source: Bhajan;
      _score: number;
      highlight?: Record<string, string[]>;
    }) => {
      const highlight = {
        author: hit._source.author,
        title: hit._source.title,
        text: hit._source.text,
        ...Object.keys(hit._source).reduce((acc, field) => {
          acc[field as keyof Bhajan] = hit.highlight?.[field]?.[0] || hit._source[field as keyof Bhajan] || "";
          return acc;
        }, {} as Record<string, string>)
      };

      return {
        bhajan: hit._source,
        score: hit._score,
        highlight
      };
    });
  }
} 