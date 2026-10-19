// docs/PROJECT-PLAN.md를 public/portfolio-final.js의 데이터에서 다시 씁니다.
import {writeFileSync} from 'node:fs';
import {finalPortfolioReport} from '../public/portfolio-final.js';

const out=new URL('../docs/PROJECT-PLAN.md',import.meta.url);
writeFileSync(out,finalPortfolioReport());
console.log('docs/PROJECT-PLAN.md');
