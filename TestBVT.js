include("PrintStatus.js")

// DeviceState
DS_None			= 0;
DS_Fault		= 1;
DS_Disabled		= 2;
DS_Stopping		= 3;
DS_Powered		= 4;
DS_InProcess	= 5;

bvt_vdrm = [];
bvt_vrrm = [];
bvt_idrm = [];
bvt_irrm = [];

bvt_VDC = [];
bvt_IDC = [];
bvt_RDC = [];

csv_array = [];

bvt_direct = 1;
bvt_use_microamps = 1;		// use microampere precision
bvt_start_v = 500;			// in V
bvt_rate = 10;				// in kV/s x10
bvt_test_time = 3000;		// in ms
bvt_pulse_sleep = 1000;		// in ms
bvt_5hz_current = 50;		// in mA
bvt_resource_test = 8; 		// Продолжительность ресурсного теста в часах

function BVT_StartPulse(N, Voltage, Current)
{	
	if (dev.r(192) == 1)
	{
		print("Fault Reason = " + dev.r(193));
		dev.c(3);
		if (dev.r(192) == 0)
		{
			print("Ошибка сброшена");
			sleep(500);
			dev.c(1);
			while(dev.r(192) != 4)
				sleep(100);
			print("Питание в блок подано");
		}		
		else
			print("Ошибка не сброшена");
	}

	if (dev.r(192) == 0)
	{
		print("Отсуствует питание в блоке");
		dev.c(1);
		while(dev.r(192) != 4)
			sleep(100);
		print("Питание в блок подано");
		sleep(500);
	}

	dev.w(128, 3);				// Test type - reverse pulse
	dev.w(130, Current);
	dev.w(131, Voltage);
	dev.w(132, bvt_test_time)	// Time plate
	dev.w(133, bvt_rate);		// Rise rate
	dev.w(134, bvt_start_v);	// Start voltage
	
	if (Current > bvt_5hz_current * 10)
		dev.w(136, 10);
	else
		dev.w(136, 1);
	
	for (var i = 0; i < N; i++)
	{
		if (N > 1) print("#" + (i + 1));
		dev.c(100);
		while (dev.r(192) == 5) 
			if (dev.r(192) == 1)
			{
				PrintStatus();
				BVT_Plot();
				return
			}
			else	
				sleep(100);
		
		if (bvt_direct)
		{
			print("Vdrm,  V: " + Math.abs(dev.rs(198)));
			print("Idrm, mA: " + BVT_ReadCurrent(bvt_use_microamps).toFixed(bvt_use_microamps ? 3 : 1));
		}
		else
		{
			print("Vrrm,  V: " + Math.abs(dev.rs(198)));
			print("Irrm, mA: " + BVT_ReadCurrent(bvt_use_microamps).toFixed(bvt_use_microamps ? 3 : 1));
		}
		
		if (dev.r(195) == 404)
		{
			PrintStatus()
			BVT_Plot();
			return
		}
		
		print("-------------");
		
		if (bvt_direct)
		{
			bvt_vdrm.push(Math.abs(dev.rs(198)));
			bvt_idrm.push(BVT_ReadCurrent(bvt_use_microamps).toFixed(bvt_use_microamps ? 3 : 1));
		}
		else
		{
			bvt_vrrm.push(Math.abs(dev.rs(198)));
			bvt_irrm.push(BVT_ReadCurrent(bvt_use_microamps).toFixed(bvt_use_microamps ? 3 : 1));
		}
		
		if (anykey()) return;
		
		if ((i + 1) < N)
			sleep(bvt_pulse_sleep);
		
		if (anykey()) return;
	}
}


function BVT_ResourceTest(Voltage, Current)
{
	csv_array = [];

	bvt_vdrm = [];
	bvt_vrrm = [];
	bvt_idrm = [];
	bvt_irrm = [];

	var i = 0;
	var today = new Date();								// Узнаем и сохраняем текущее время
	var hours = today.getHours() + bvt_resource_test;	// Узнаем кол-во часов в текущем времени и прибавляем к нему продолжительность ресурсного теста
	today.setHours(hours);								// Задаем новое количество часов в дату

	while((new Date()).getTime() < today.getTime())		// Сравниваем текущее время на компьютере в мс, с конечным временем в мс
	{
		BVT_StartPulse(1, Voltage, Current);
		var left_time = new Date((today.getTime()) - ((new Date()).getTime()));
		print("#" + i + " Осталось " + (left_time.getHours()-3) + " ч и " + left_time.getMinutes() + " мин");
		
		csv_array.push((new Date()) + ";" + bvt_vdrm[i] + ";" + bvt_idrm[i]);
		save("data/BVT_ResourceTest" + today.getTime() + ".csv", csv_array);

		i++;
		sleep(bvt_pulse_sleep);
		if (anykey()) break;
	}
}

function BVT_ResourceTestDC(Voltage)
{
	csv_array = [];

	bvt_VDC = [];
	bvt_IDC = [];

	var i = 0;
	var today = new Date();								// Узнаем и сохраняем текущее время
	var hours = today.getHours() + bvt_resource_test;	// Узнаем кол-во часов в текущем времени и прибавляем к нему продолжительность ресурсного теста
	today.setHours(hours);								// Задаем новое количество часов в дату

	csv_array.push("Time; VDC, in V; IDC, in uA; RDC, in MOhm");
	while((new Date()).getTime() < today.getTime())		// Сравниваем текущее время на компьютере в мс, с конечным временем в мс
	{
		sleep(100);
		BVT_StartRes(1, Voltage);
		var left_time = new Date((today.getTime()) - ((new Date()).getTime()));
		print("#" + i + " Осталось " + (left_time.getHours()-3) + " ч и " + left_time.getMinutes() + " мин");
		
		csv_array.push((new Date()) + ";" + bvt_VDC[i] + ";" + bvt_IDC[i] + ";" + bvt_RDC[i]);
		save("data/BVTDC_ResourceTest" + today.getTime() + ".csv", csv_array);

		i++;
		sleep(bvt_pulse_sleep);
		if (anykey()) break;
	}
}

function BVT_StartDC(N, Voltage, Current)
{
	dev.w(128, 4);
	dev.w(138, bvt_test_time)	// Time plate
	dev.w(139, Current);
	dev.w(140, Voltage);
	dev.w(141, bvt_rate);		// Rise rate
	
	for (var i = 0; i < N; i++)
	{
		if (N > 1) print("#" + (i + 1));
		dev.c(100);
		while (dev.r(192) == 5) sleep(100);
		
		print("Vdc,   V: " + dev.r(198));
		print("Idc,  mA: " + BVT_ReadCurrent(bvt_use_microamps).toFixed(bvt_use_microamps ? 3 : 1));
		print("-------------");

		if (anykey()) return;
		
		if ((i + 1) < N)
			sleep(bvt_pulse_sleep);
	}
}

function BVT_StartDCStep(N, Voltage, Current)
{
	dev.w(128, 5);
	dev.w(138, bvt_test_time)	// Time plate
	dev.w(139, Current);
	dev.w(140, Voltage);
	dev.w(141, bvt_rate);		// Rise rate
	
	for (var i = 0; i < N; i++)
	{
		if (N > 1) print("#" + (i + 1));
		dev.c(100);
		while (dev.r(192) == 5) sleep(100);
	
		print("Vdc,   V: " + dev.r(198));
		print("Idc,  mA: " + BVT_ReadCurrent(bvt_use_microamps).toFixed(bvt_use_microamps ? 3 : 1));
		print("-------------");
		
		if (anykey()) return;
		
		if ((i + 1) < N)
			sleep(bvt_pulse_sleep);
	}
}

function BVT_StartRes(N, Voltage)
{
	dev.w(128, 6);
	dev.w(144, Voltage);
	
	for (var i = 0; i < N; i++)
	{
		if (N > 1) print("#" + (i + 1));
		dev.c(100);
		while (dev.r(192) == 5) sleep(100);
		
		var warn = dev.r(195);
		print("R,  MOhm: " + (dev.r(201) / 10));
		print("Vdc,   V: " + dev.r(198));
		print("Idc,  uA: " + ((dev.rs(199) / 10) + ((dev.rs(200) % 100) / 1000) + (dev.rs(202) / 1000000)) * 1000);

		if (warn)
			print("Warning : " + warn);
		print("-------------");
		
		bvt_RDC.push(dev.r(201) / 10);
		bvt_VDC.push(dev.r(198));
		bvt_IDC.push(((dev.rs(199) / 10) + ((dev.rs(200) % 100) / 1000) + (dev.rs(202) / 1000000)) * 1000);
		
		if (anykey()) return;
		
		if ((i + 1) < N)
			sleep(bvt_pulse_sleep);
	}
}

function BVT_StartAC(N, Voltage, Current)
{	
	dev.w(128, 1);				// Test type - reverse pulse
	dev.w(130, Current);		// Voltage
	dev.w(131, Voltage);		// Current
	dev.w(132, bvt_test_time)	// Time plate
	dev.w(133, bvt_rate);		// Rise rate
	dev.w(134, bvt_start_v);	// Start voltage

	for (var i = 0; i < N; i++)
	{
		if (N > 1) print("#" + (i + 1));
		dev.c(100);
		while (dev.r(192) == 5) sleep(100);
		
		print("Vac,  V: " + Math.abs(dev.rs(198)));
		print("Iac, mA: " + Math.abs(dev.rs(199) / 10));
		print("-------------");
		
		if (anykey()) return;
		
		if ((i + 1) < N)
			sleep(bvt_pulse_sleep);
	}
}

function BVT_Test(Voltage, Current)
{	
	dev.w(128, 6);		// Test type - Test
	dev.w(0, 1000);		// Raw PWM amplitude
	//
	dev.w(3, Current);
	dev.w(4, Voltage);
	dev.w(130, Current);
	dev.w(131, Voltage);
	//
	dev.c(100);
}

function BVT_ReadCurrent(UseMicroAmps)
{
	var CoarseI = Math.abs(dev.rs(199) / 10);
	if (UseMicroAmps)
		return Math.floor(dev.r(199) / 10) + dev.r(200) / 1000 + dev.r(202) / 1000000;
	else
		return CoarseI;
}

function BVT_Read()
{
	var a, b;

	a = new Array();
	b = new Array();

	while(true)
	{
		dev.c(110);

		var a1 = dev.rafs(1);
		var b1 = dev.rafs(2);
		
		a = a.concat(a1);
		b = b.concat(b1);

		if(a1.length == 0)
		break;
	}

	return {Voltage : a, Current : b};
}

function BVT_PrintV()
{
	print("Capacitor voltage [V]: " + dev.r(210));
}

function BVT_Plot(Divisor)
{
	var CurrentDiv = 10;
	if (typeof Divisor != 'undefined')
		CurrentDiv = Divisor;
	
	var ResArray = BVT_Read();
	
	// invert values
	for (var i = 0; i < ResArray.Voltage.length; i++)
		ResArray.Voltage[i] = -ResArray.Voltage[i] * ((CurrentDiv < 0) ? -1 : 1);
	for (var i = 0; i < ResArray.Current.length; i++)
		ResArray.Current[i] = -ResArray.Current[i] / CurrentDiv;
	
	plot(ResArray.Voltage, 1, 0); sleep(200);
	plot(ResArray.Current, 1, 0);
	return ResArray;
}

function BVT_PlotDiagX(Divisor, WithPWM)
{
	var curr = dev.rafs(1);
	var vlt = dev.rafs(2);
	var pwm = dev.rafs(3);
	
	if (typeof Divisor != 'undefined')
	{
		for (var i = 0; i < curr.length; ++i)
			curr[i] /= Divisor;
	}
	
	if (WithPWM)
		plot3(vlt, curr, pwm, 1, 0);
	else
		plot2(vlt, curr, 1, 0);
}

function BVT_PlotDiag(Divisor)
{
	BVT_PlotDiagX(Divisor, true)
}

function BVT_PlotDiagVI(Divisor)
{
	BVT_PlotDiagX(Divisor, false)
}

function BVT_PlotXY2(Divisor)
{
	var CurrentDiv = 10;
	if (typeof Divisor != 'undefined')
		CurrentDiv = Divisor;
	
	var curr = dev.rafs(5);
	var vlt = dev.rafs(6);
	
	for (var i = 0; i < curr.length; ++i)
		curr[i] /= CurrentDiv;
	
	plotXY(vlt, curr);
}

function BVT_PlotXY(Divisor)
{
	var CurrentDiv = 10;
	if (typeof Divisor != 'undefined')
		CurrentDiv = Divisor;
	
	dev.c(111);
	var ResArray = BVT_Read();
	
	// invert values
	for (var i = 0; i < ResArray.Voltage.length; i++)
		ResArray.Voltage[i] = -ResArray.Voltage[i] * ((CurrentDiv < 0) ? -1 : 1);
	for (var i = 0; i < ResArray.Current.length; i++)
		ResArray.Current[i] = -ResArray.Current[i] / CurrentDiv;
	
	plotXY(ResArray.Voltage, ResArray.Current);
	return ResArray;
}

function BVT_ResetA()
{
	bvt_vdrm = [];
	bvt_vrrm = [];
	bvt_idrm = [];
	bvt_irrm = [];
}

function BVT_TestStop(Counter, Voltage, Time)
{
	dev.w(128, 3);
	dev.w(130, 50);
	dev.w(131, Voltage);
	dev.w(132, Time);
	dev.w(133, 20);
	dev.w(134, 500);
	dev.w(136, 1);
	
	for (var i = 0; i < Counter; ++i)
	{
		var delay;
		
		dev.c(100);
		sleep(delay = Math.round(Math.random() * Time));
		dev.c(101);
		
		do
		{
			var st = dev.r(192);
			sleep(50);
		}
		while (st == 5 || st == 3);
		
		if (dev.r(192) == 4)
		{
			print("#" + (i + 1) + " ok " + delay);
			dev.c(111);
			plot(dev.rafs(2), 50, 0); sleep(200);
			plot(dev.rafs(3), 50, 0);
		}
		else
		{
			print("#" + (i + 1) + " failed " + delay);
			PrintStatus();
			return;
		}
		
		sleep(1000);
		if (anykey()) return;
	}
}