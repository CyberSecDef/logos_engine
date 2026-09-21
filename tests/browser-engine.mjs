import {chromium,webkit} from '@playwright/test';
export function launchTestBrowser(){
 const engine=process.env.LOGOS_BROWSER??'chromium';
 if(engine==='webkit')return webkit.launch({headless:true});
 if(engine!=='chromium')throw Error('LOGOS_BROWSER must be chromium or webkit');
 return chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
}
