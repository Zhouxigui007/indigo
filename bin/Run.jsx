#target Illustrator-13

#include "mc.jsx"

/*
 * Обычная сборка
 */
#include "Assembly.jsx"
make = new assembly(app);

make.setup();
make.run();

/*
 * Сборка-утверждение

#include "Matching.jsx"
u = new matching(app);
u.setup();
u.roll_number = 2;
u.templateFolder = new Folder ('D:\\work\\template\\short');
u.temp = '4090354_short';
u.run();


 * Ахтунг

#include "Achtung.jsx"
a = new achtung(app);
a.setup();
a.templateFolder = new Folder ('D:\\work\\template\\short');
a.temp = '4090354_short';
a.run(); 
 */