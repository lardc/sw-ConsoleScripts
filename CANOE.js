function con(port)
{
	dev.co(port)
}

function home()
{
	dev.c(100)
	p("Запущен хоуминг")
	while (dev.r(96) != 3)
	{
		if (anykey()) return
		sleep(100)
	}
	p("Хоуминг выполнен")
}

function pos(x)
{
	x = (x >>> 0)
	
	dev.w(64, (x & 0xFFFF))
	dev.w(65, ((x >> 16) & 0xFFFF))
	dev.c(101)
	
	while (dev.r(96) != 3)
	{
		if (anykey()) return
		sleep(100)
	}
}

function speed(x)
{
	dev.w(19, x)
}

function force(x)
{
	dev.w(20, x)
}

function stop_exec()
{
	while(true)
	{
		var k = readkey()
		if(k == 'n')
			return true
		else if (k == 'y')
			return false
	}
}

function step_p()
{
	p("Для запуска шага нажмите \'y\', для выхода нажмите 'n'\n")
	
	p("Опустить головы")
	if(stop_exec()) return
	dev.c(150)
	
	p("Открыть СО2")
	if(stop_exec()) return
	dev.c(154)
	
	p("Закрыть СО2")
	if(stop_exec()) return
	dev.c(155)
	
	p("Открыть налив")
	if(stop_exec()) return
	dev.c(152)
	
	p("Закрыть налив")
	if(stop_exec()) return
	dev.c(153)
	
	p("Поднять головы")
	if(stop_exec()) return
	dev.c(151)
	p("\nВсе шаги выполнены")
}

function co2(action)
{
	dev.c(action ? 154 : 155)
}

function beer(action)
{
	dev.c(action ? 152 : 153)
}

function heads(action)
{
	dev.c(action ? 150 : 151)
}

function save()
{
	dev.c(200)
	p("Настройки сохранены")
}

function get_long_number(start_reg)
{
	return (dev.r(start_reg + 1) << 16) | dev.r(start_reg)
}

function info()
{
	p("Остановка налива по " + ((dev.r(39) == 0) ? "таймеру" : "датчику") + "\n")
	p("1.  Время опускания голов, мс:\t\t" + dev.r(36))
	p("2.  Время подачи CO2, мс:\t\t" + dev.r(35))
	p("3.  Задержка перед наливом, мс:\t\t" + dev.r(37))
	p("4.  Время налива, мс:\t\t\t" + dev.r(34))
	p("5.  Задержка перед поднятием, мс:\t" + dev.rs(38))
	p("    (может быть отрицательной)")
	p("---")
	p("6.  Время зажатия банки, мс:\t\t" + dev.r(40))
	p("7.  Время раскрутки шпинделя, мс:\t" + dev.r(41))
	p("8.  Время закатки этап1, мс:\t\t" + dev.r(42))
	p("9.  Время закатки этап2, мс:\t\t" + dev.r(43))
	p("10. Время раскрутки шпинделя, мс:\t" + dev.r(44))
	p("---")
	p("11. Позиция закатки этап1:\t\t" + get_long_number(47))
	p("12. Позиция закатки этап2:\t\t" + get_long_number(49))
	p("---")
	p("13. Момент на двигателе, %:\t\t" + dev.r(20))
	p("14. Скорость при закатке, %:\t\t" + dev.r(19))
	p("15. Скорость при перемещении, %:\t" + dev.r(61))
	p("16. Оффсет перед закаткой:\t\t" + dev.r(62))
}

function write(param, value)
{
	switch(param)
	{
		case 1:
			dev.w(36, value)
			break
			
		case 2:
			dev.w(35, value)
			break
			
		case 3:
			dev.w(37, value)
			break
			
		case 4:
			dev.w(34, value)
			break
			
		case 5:
			dev.ws(38, value)
			break
			
		case 6:
			dev.w(40, value)
			break
			
		case 7:
			dev.w(41, value)
			break
			
		case 8:
			dev.w(42, value)
			break
			
		case 9:
			dev.w(43, value)
			break
			
		case 10:
			dev.w(44, value)
			break
			
		case 11:
			value = value >>> 0
			dev.w(47, value & 0xFFFF)
			dev.w(48, (value >> 16) & 0xFFFF)
			break
			
		case 12:
			value = value >>> 0
			dev.w(49, value & 0xFFFF)
			dev.w(50, (value >> 16) & 0xFFFF)
			break
			
		case 13:
			dev.w(20, value)
			break
			
		case 14:
			dev.w(19, value)
			break
			
		case 15:
			dev.w(61, value)
			break
			
		case 16:
			dev.w(62, value)
			break
			
		default:
			p("Неверный номер параметра")
			break
	}
}

function pos_by_step(start_reg)
{
	dev.w(64, dev.r(start_reg))
	dev.w(65, dev.r(start_reg + 1))
	dev.c(101)
	
	while (dev.r(96) != 3)
	{
		if (anykey()) return
		sleep(100)
	}
}

function step_s()
{
	p("Для запуска шага нажмите \'y\', для выхода нажмите 'n'\n")
	
	p("Зажать банку")
	if(stop_exec()) return
	dev.c(158)
	
	p("Раскрутить шпиндель")
	if(stop_exec()) return
	dev.c(156)
	
	p("Переместить валки в позицию 1")
	if(stop_exec()) return
	pos_by_step(47)
	
	p("Переместить валки в позицию 2")
	if(stop_exec()) return
	pos_by_step(49)
	
	p("Переместить валки в 0")
	if(stop_exec()) return
	pos(0)
	
	p("Остановить шпиндель")
	if(stop_exec()) return
	dev.c(157)
	
	p("Разжать банку")
	if(stop_exec()) return
	dev.c(159)
	p("\nВсе шаги выполнены")
}

function spindle_run()
{
	dev.c(156)
}

function spindle_stop()
{
	dev.c(157)
}

function buttons()
{
	p("Кнопка 1: " + dev.r(107))
	p("Кнопка 2: " + dev.r(108))
	p("Кнопка 3: " + dev.r(109))
}
