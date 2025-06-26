include("PrintStatus.js");
include("TEK_GetData.js");

// Global definitions
GateCurrentRate = 2000;
GateCurrent = 2000;
//
tou_print = 1;
PulseToPulseDelay = 2000;
//

// TOU HP
function TOUHP_Start(N, Voltage, Current, GateCurrent, GateCurrentRate)
{
	for(var i = 0; i < N; i++)
	{
		print("#" + i);
		
		TOUHP_Measure(Voltage, Current, GateCurrent, GateCurrentRate);

		if(dev.r(193) || dev.r(196))
		{
			TOUHP_PrintFault();
			break;
		}
		
		sleep(PulseToPulseDelay);
		
		if(anykey())
			break;
	}
}

function TOUHP_Measure(Voltage, Current, GateCurrent, GateCurrentRate)
{
	while(dev.r(192) != 3)
	{
		sleep(50);
		
		if(dev.r(192) == 1)
			return;
		else if(dev.r(192) == 0)
			dev.c(1);
		if(anykey()) break;
	}
		
	dev.w(128, Voltage);
	dev.w(129, Current);
	dev.w(130, GateCurrent);
	dev.w(131, GateCurrentRate);
	
	dev.c(100);
	
	sleep(100);
	
	while(dev.r(192) == 4){sleep(50);}
	
	if(tou_print)
	{
		print("Anode current, A  = " + dev.r(250));
		print("Turn on, ns       = " + dev.r(252));
		print("Turn on delay, ns = " + dev.r(251));
		print("--------------");
	}
}

function TOUHP_PrintFault()
{
	print("DeviceState   	  = "+dev.r(192));
	print("FaultReason   	  = "+dev.r(193));
	print("Warning       	  = "+dev.r(195));
	print("Problem       	  = "+dev.r(196));
}

function TOUHP_MeasureRiseTimeId(FirstLevel, SecondLevel, Channel, Rshunt)
{
	var id_sc_arr = [];
	id_sc_arr = TEK_GetChannelData(Channel);

	var id_firstlevel_err = 0;
	var id_secondlevel_err = 0;
	var id_firstlevel_min_err = 0;
	var id_secondlevel_min_err = 0;

	var id_max = 0;

	var id_firstlevel_index = 0;
	var id_secondlevel_index = 0;

	// Поиск максимального значения
	var id_max = id_sc_arr[0];
	for (var i = 0; i < id_sc_arr.length; i++)
	{
		if (id_sc_arr[i] > id_max)
			id_max = id_sc_arr[i]
	}

	// Вычисление напряжения для уровней FirstLevel и SecondLevel
	var id_firstlevel = id_max * FirstLevel / 100;
	var id_secondlevel = id_max * SecondLevel / 100;

	// Определение индекса элемента массива с наименьшей ошибкой
	id_firstlevel_min_err = Math.abs(id_firstlevel - id_sc_arr[0]);
	for(var k = 1; k < id_sc_arr.length; k++)
	{
		var id_firstlevel_err = Math.abs(id_firstlevel - id_sc_arr[k]);
		if(id_firstlevel_err < id_firstlevel_min_err)
		{
			id_firstlevel_min_err = id_firstlevel_err;
			id_firstlevel_index = k;
		}
	}

	id_secondlevel_min_err = Math.abs(id_secondlevel - id_sc_arr[0]);
	for(var m = 1; m < id_sc_arr.length; m++)
	{
		var id_secondlevel_err = Math.abs(id_secondlevel - id_sc_arr[m]);
		if(id_secondlevel_err < id_secondlevel_min_err)
		{
			id_secondlevel_min_err = id_secondlevel_err;
			id_secondlevel_index = m;
		}
	}

	// Расстояние по горизонтали между двумя ближайшими точками
	var time_scale = TEK_GetTimeScale();
	var time_arr_min = time_scale / 250;

	var di = Math.abs(id_sc_arr[id_secondlevel_index] - id_sc_arr[id_firstlevel_index]) / Rshunt; 
	var dt = Math.abs(id_secondlevel_index - id_firstlevel_index)
			* time_arr_min * 1e+6;
	var di_dt = Math.round(di / dt);
	print("dId/dt " + FirstLevel + "/" + SecondLevel + ", A/us = " + di_dt);

	return di_dt;
}

// TOCU HP
function TOCUHP_Pulse(N, Voltage, Bit)
{	
	if(dev.r(192) == 3)
	{
		dev.w(128, Voltage);
		dev.w(129, Bit);
		dev.c(100);
	
		for(i=0; i < N; i++)
		{
			while(dev.r(192) == 4){sleep(50)}
			
			if(dev.r(192) == 3)
			{
				dev.c(101);
				dev.c(102);
			}
			
			while(dev.r(192) == 4){sleep(50)}
			
			if (tou_print)
			{
				print("N          = " + i)
				print("Voltage, V = " + dev.r(200));
				print("-----------");
			}

			if(anykey())
				break;
		}
	}
	else
		PrintStatus();
}

function TOCUHP_Pulse_Hz(Voltage, Bit, Hertz, Minutes)
{
	var period_ms = (1 / Hertz) * 1000;
	var start = new Date();
	var stop = new Date();
	var minutes = start.getMinutes() + Minutes;
	stop.setMinutes(minutes);
	var i = 1;
	print("Начало теста: " + new Date());

	while((new Date()).getTime() < stop.getTime())
	{
		var start_pulse = new Date();
		var stop_pulse = new Date();
		var milliseconds = start_pulse.getMilliseconds() + period_ms;
		stop_pulse.setMilliseconds(milliseconds);

		print("Импульс № " + i);
		TOCUHP_Pulse(1, Voltage, Bit);

		while((new Date()).getTime() < stop_pulse.getTime())
		{
			if (anykey()) return;
			sleep(1);
		}

		i++;

		if (anykey()) break;
	}
	p("Конец теста: " + new Date());
}

function TOCUHP_ResourceTest(Voltage, Bit, HoursTest, Sleep)
{
	var i = 1;
	var end = new Date();
	var start = new Date();
	var hours = start.getHours() + HoursTest;
	end.setHours(hours);

	while((new Date()).getTime() < end.getTime())
	{
		TOCUHP_Pulse(1, Voltage, Bit);

		var left_time = new Date(end.getTime() - (new Date()).getTime());
		print("#" + i + " Осталось " + (left_time.getHours() - 3) + " ч и " + left_time.getMinutes() + " мин");
		sleep(Sleep);
		if (anykey()) break;

		i++;
	}
}

// TOMU HP
function TOMUHP_GatePulse(GateCurrentRate, GateCurrent)
{	
	dev.w(130, GateCurrent);
	dev.w(131, GateCurrentRate);
	
	dev.c(110);
}

function TOU_to24Bit()
{
	// Считываем переменные с регистров
	number = (dev.r(209) << 12) | dev.r(208)

	// Конвертируем число в 32-битное беззнаковое целое
	bits = (number >>> 0).toString(2);
	
	// Берем последние 24 бита
	bits = bits.slice(-24);
	
	// Дополняем нулями слева
	while (bits.length < 24)
		bits = '0' + bits;

	// Добавляем пробелы через каждые 4 символа
	result = '';
	for (var i = 0; i < bits.length; i += 4) {
		result += bits.substring(i, i + 4) + ' ';
	}
	
	print(" Tgd - 90% Ud | Tgt - 10% Ud ");
	print(result);
}