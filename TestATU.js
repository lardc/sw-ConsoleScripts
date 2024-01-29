include("PrintStatus.js")

atu_hp			= 1;	// 0 - ATU; 1 - ATU HP;
atu_print		= 1;	// Enable printed output

// Status check
function _ATU_Active()
{
	if (dev.r(96) == 4 || dev.r(96) == 1)
		return 0;
	else
		return 1;
}

// Single pulse measurement 
function ATU_Pulse(PreCurrent, Current)
{
	dev.w(66, Math.round(Current / 2));
	dev.w(64, PreCurrent);
	dev.c(atu_hp ? 76 : 105);
	while (_ATU_Active()) { sleep(100); };
	
	return ATU_GetResult();
}

// Single measurement by power
function ATU_StartPower(PreCurrent, Power)
{
	dev.w(65, Power / (atu_hp ? 10 : 1));
	dev.w(64, PreCurrent);
	dev.c(100);
	while (_ATU_Active()) { sleep(100); };
	
	ATU_PrintWarning();
	return ATU_GetResult();
}

// Print values (Ubr, Uprsm, Iprsm, Prsm)
function ATU_GetResult()
{
	var Vbr = dev.r(109);
	var V = dev.r(110);
	var I = dev.r(111);
	var P = dev.r(112) * (atu_hp ? 10 : 1);
	
	if (atu_print)
	{
		print("Ubr,	 V: " + Vbr);
		print("U(Prsm), V: " + V);
		print("I(Prsm), A: " + (I / 1000).toFixed(2));
		print("Prsm,   kW: " + (P / 1000).toFixed(2));
		print("---------")
	}
	
	return {Vbr:Vbr, V:V, I:I, P:P}
}

// Print capacitors voltage
function ATU_PrintV()
{
	if (atu_hp)
	{
		dev.c(72);
		print("Cell voltage 1 [V]: " + (dev.r(103) / 10));
		print("Cell voltage 2 [V]: " + (dev.r(104) / 10));
	}
	else
		print("Cell voltage [V]: " + (dev.r(104) / 10));
}

// Plot graphs
function ATU_Plot()
{
	var current = dev.raf(2);
	for (var i = 0; i < current.length; ++i)
		current[i] /= 1000;
	
	plot(dev.raf(1), 1, 0); sleep(200);
	plot(current, 1, 0); sleep(200);
	plot(dev.raf(3), 1, 0);
}

// Plot diag graphs
function ATU_PlotDiag()
{
	plot(dev.raf(4), 1, 0); sleep(200);
	plot(dev.raf(5), 1, 0); sleep(200);
	plot(dev.raf(6), 1, 0); sleep(200);
	plot(dev.raf(7), 1, 0);
}

// Read, decode and print warning
function ATU_PrintWarning()
{
	var warning = dev.r(99);
	
	if (warning)
	{
		var msg = "";
		switch (warning)
		{
			case 1:
				msg = "Idle";
				break;
			case 2:
				msg = "Short";
				break;
			case 3:
				msg = "High power error";
				break;
			case 4:
				msg = "DUT break";
				break;
			case 5:
				msg = "Facet break";
				break;
		}
		
		print("Warning: " + msg);
	}
}

// Resource test by power
function ATU_ResourseTest(PreCurrent, Power, Hours, Sleep)
{
	var csv_array = [];
	var count_pulse = 0;

	catu_v = [];
	catu_i = [];
	catu_p = [];
	catu_p_set = [];

	var i = 0;
	var today = new Date();					// Узнаем и сохраняем текущее время
	var hours = today.getHours() + Hours;	// Узнаем кол-во часов в текущем времени и прибавляем к нему продолжительность ресурсного теста
	today.setHours(hours);					// Задаем новое количество часов в дату

	csv_array.push("time; catu_v; catu_i; catu_p_set; catu_p; p_sc");

	while((new Date()).getTime() < today.getTime())		// Сравниваем текущее время на компьютере в мс, с конечным временем в мс
	{
		ATU_StartPower(PreCurrent, Power);
		var left_time = new Date((today.getTime()) - ((new Date()).getTime()));
		print("#" + i + " Осталось " + (left_time.getHours()-3) + " ч и " + left_time.getMinutes() + " мин");

		catu_v[i] = dev.r(110);
		catu_i[i] = dev.r(111);
		catu_p[i] = dev.r(112) * (atu_hp ? 10 : 1);
		catu_p_set[i] = dev.r(65) * 10;

		count_pulse = dev.r(105);

		csv_array.push((new Date()) + ";" + catu_v[i] + ";" + catu_i[i] + ";" + catu_p_set[i] + ";" + catu_p[i] + ";" + count_pulse);
		save("data/ATUResourceTest.csv", csv_array);

		i++;
		sleep(Sleep);
		if (anykey()) return;

	}
}