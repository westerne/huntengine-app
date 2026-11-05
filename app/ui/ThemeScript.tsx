// Sets the saved theme before first paint, so there's no light/dark flash.
export default function ThemeScript() {
  const code = `try{var t=localStorage.getItem('hq-theme');if(t==='light'||t==='dark')document.documentElement.classList.add('theme-'+t)}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
